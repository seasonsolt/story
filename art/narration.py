"""Pure-Chinese ElevenLabs voice synthesizer & verifier for 冰雪故事小导演.

Run (with ELEVENLABS_API_KEY in env):
    python3 art/narration.py
Check without keys:
    python3 art/narration.py --verify-manifest
"""
import argparse
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
EL_API = 'https://api.elevenlabs.io'
EL_PREFIX = 'elevenlabs:'
MODELS = {'eleven_v3', 'eleven_v4', 'eleven_flash_v2_5', 'eleven_turbo_v2_5', 'eleven_multilingual_v2'}
RATE_RE = re.compile(r'^([+-]\d+)%$')
SAMPLE_RATE = 24000
BITRATE = '48k'
TAIL = 0.06
LOUDNESS = 'I=-18:TP=-1.5:LRA=9'
MANIFEST_NAME = 'vo_manifest.json'


class Fail(Exception):
    pass


def load_json(path, kind):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except OSError as e:
        raise Fail(f'cannot read {kind} {path}: {e}')
    except json.JSONDecodeError as e:
        raise Fail(f'{kind} {path} is not valid JSON: {e}')


def rate_factor(rate):
    m = RATE_RE.match(rate)
    if not m:
        raise Fail(f'bad voice rate {rate!r}')
    pct = int(m.group(1))
    if not -30 <= pct <= 50:
        raise Fail(f'voice rate {rate!r} outside -30%..+50%')
    return round(1.0 + pct / 100.0, 2)


class Content:
    def __init__(self, lines_path):
        raw = load_json(lines_path, 'lines')
        self.voices = raw.get('voices', {})
        self.lines = raw.get('lines', {})
        if not self.voices or not self.lines:
            raise Fail('lines.json requires voices and lines')
        for sp, tbl in self.voices.items():
            v = tbl.get('zh')
            if not (isinstance(v, list) and len(v) == 3 and isinstance(v[0], str) and v[0].startswith(EL_PREFIX)):
                raise Fail(f'voice {sp}.zh invalid')
            rate_factor(v[1])
            if v[2] not in MODELS:
                raise Fail(f'unknown model {v[2]}')
        for key, defn in self.lines.items():
            who = defn.get('who')
            if who not in self.voices:
                raise Fail(f'{key}: unknown speaker {who!r}')
            say = defn.get('say')
            if not (isinstance(say, list) and len(say) >= 1 and all(isinstance(x, str) and x.strip() for x in say)):
                raise Fail(f'{key}: say must be non-empty list of Chinese strings')

    def voice(self, who):
        return tuple(self.voices[who]['zh'])

    def text(self, key):
        return ' '.join(s.strip() for s in self.lines[key]['say'])


def clip_hash(voice, text):
    return hashlib.sha1(json.dumps([*voice, text], ensure_ascii=False, separators=(',', ':')).encode('utf-8')).hexdigest()


def current_hashes(content):
    return {f'vo_{k}.mp3': clip_hash(content.voice(content.lines[k]['who']), content.text(k)) for k in content.lines}


def subs_doc(content):
    return {
        'v': 1,
        'lines': {
            k: {'who': content.lines[k]['who'], 't': content.text(k)}
            for k in content.lines
        },
    }


def load_manifest(path):
    if not os.path.exists(path):
        return None
    doc = load_json(path, 'manifest')
    if not (isinstance(doc, dict) and doc.get('v') == 1 and isinstance(doc.get('clips'), dict)):
        raise Fail(f'{path} is not a v1 manifest')
    return doc['clips']


def write_manifest(path, clips):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    part = path + '.part'
    with open(part, 'w', encoding='utf-8') as f:
        json.dump({'v': 1, 'clips': dict(sorted(clips.items()))}, f, indent=1, ensure_ascii=False)
        f.write('\n')
    os.replace(part, path)


def manifest_problems(content, manifest):
    cur = current_hashes(content)
    out = [(n, 'stale') for n in cur if n in manifest and manifest[n] != cur[n]]
    out += [(n, 'unrecorded') for n in cur if n not in manifest]
    out += [(n, 'extra') for n in manifest if n not in cur]
    return sorted(out)


def find_orphans(content, out_dir):
    expected = set(current_hashes(content))
    present = {f for f in os.listdir(out_dir) if f.startswith('vo_') and f.endswith('.mp3')} if os.path.isdir(out_dir) else set()
    return sorted(present - expected), sorted(expected - present)


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        raise Fail(f'{cmd[0]} failed: {r.stderr.strip()[-400:]}')
    return r


def loudnorm_filter(wav):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', wav, '-af', f'loudnorm={LOUDNESS}:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True)
    m = re.search(r'\{[^{}]*"input_i"[^{}]*\}', r.stderr, re.S)
    if r.returncode == 0 and m:
        try:
            d = json.loads(m.group(0))
            vals = {k: float(d[k]) for k in ('input_i', 'input_tp', 'input_lra', 'input_thresh', 'target_offset')}
            if all(math.isfinite(v) for v in vals.values()):
                return (f'loudnorm={LOUDNESS}:measured_I={vals["input_i"]}:measured_TP={vals["input_tp"]}:measured_LRA={vals["input_lra"]}'
                        f':measured_thresh={vals["input_thresh"]}:offset={vals["target_offset"]}:linear=true')
        except (ValueError, KeyError):
            pass
    return None


def synth_jobs(jobs, out_dir):
    import time
    import urllib.error
    import urllib.request
    from concurrent.futures import ThreadPoolExecutor

    api_key = os.environ.get('ELEVENLABS_API_KEY')
    if not api_key:
        raise Fail('ELEVENLABS_API_KEY is not set')

    with tempfile.TemporaryDirectory() as tmp:
        def fetch_one(name, voice, text):
            body = {'text': text, 'model_id': voice[2]}
            if rate_factor(voice[1]) != 1:
                body['voice_settings'] = {'speed': rate_factor(voice[1])}
            url = f'{EL_API}/v1/text-to-speech/{voice[0][len(EL_PREFIX):]}?output_format=mp3_44100_128'
            err = ''
            for attempt in range(4):
                req = urllib.request.Request(url, data=json.dumps(body).encode('utf-8'),
                                             headers={'xi-api-key': api_key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
                try:
                    with urllib.request.urlopen(req, timeout=120) as r:
                        data = r.read()
                    if data:
                        raw_mp3 = os.path.join(tmp, name + '.raw.mp3')
                        with open(raw_mp3, 'wb') as f:
                            f.write(data)
                        return raw_mp3
                except urllib.error.HTTPError as e:
                    err = f'HTTP {e.code}: {e.read()[:200].decode("utf-8", "replace")}'
                    if e.code not in (429, 500, 502, 503, 504):
                        break
                except OSError as e:
                    err = str(e)
                time.sleep(2 * (attempt + 1))
            raise Fail(f'ElevenLabs failed for {name}: {err}')

        print(f'synthesizing {len(jobs)} Chinese voice clips ...', file=sys.stderr)
        with ThreadPoolExecutor(4) as ex:
            futs = [(name, ex.submit(fetch_one, name, voice, text), h) for name, voice, text, h in jobs]
            done = {}
            for name, fut, h in futs:
                raw_mp3 = fut.result()
                wav = os.path.join(tmp, name + '.wav')
                edge = 'silenceremove=start_periods=1:start_threshold=-60dB:start_silence=0.05'
                run(['ffmpeg', '-v', 'error', '-y', '-i', raw_mp3, '-af', f'{edge},areverse,{edge},areverse,apad=pad_dur={TAIL}',
                     '-ar', str(SAMPLE_RATE), '-ac', '1', wav])
                af = loudnorm_filter(wav)
                out_path = os.path.join(out_dir, name)
                part = out_path + '.part'
                cmd = ['ffmpeg', '-v', 'error', '-y', '-i', wav] + (['-af', af] if af else []) + \
                      ['-ar', str(SAMPLE_RATE), '-ac', '1', '-c:a', 'libmp3lame', '-b:a', BITRATE, '-f', 'mp3', part]
                run(cmd)
                os.replace(part, out_path)
                dur = float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out_path]).stdout)
                print(f'  {name}  {dur:.2f}s  {os.path.getsize(out_path) // 1024} KB', file=sys.stderr)
                done[name] = h
            return done


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--only')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--prune', action='store_true')
    ap.add_argument('--write-manifest', action='store_true')
    ap.add_argument('--verify-manifest', action='store_true')
    ap.add_argument('--lines', default=os.path.join(HERE, '..', 'src', 'content', 'lines.json'))
    ap.add_argument('--out', default='game')
    a = ap.parse_args(argv)
    try:
        content = Content(a.lines)
        cur = current_hashes(content)
        manifest_path = os.path.join(a.out, MANIFEST_NAME)
        if a.write_manifest:
            absent = {n for n in cur if not os.path.isfile(os.path.join(a.out, n))}
            write_manifest(manifest_path, {n: h for n, h in cur.items() if n not in absent})
            return 0
        if a.verify_manifest:
            man = load_manifest(manifest_path)
            if man is None:
                raise Fail(f'no manifest at {manifest_path}')
            probs = manifest_problems(content, man)
            for n, k in probs:
                print(n, '|', k)
            return 1 if probs else 0
        if a.prune:
            orphans, _ = find_orphans(content, a.out)
            for f in orphans:
                print(f)
            if not a.dry_run:
                for f in orphans:
                    os.remove(os.path.join(a.out, f))
            return 0
        only = {k.strip() for k in a.only.split(',') if k.strip()} if a.only else None
        man = load_manifest(manifest_path) or {}
        jobs = []
        for k, defn in content.lines.items():
            if only is not None and k not in only:
                continue
            fname = f'vo_{k}.mp3'
            h = cur[fname]
            if a.all or only is not None or not os.path.isfile(os.path.join(a.out, fname)) or man.get(fname) != h:
                jobs.append((fname, content.voice(defn['who']), content.text(k), h))
        if a.dry_run:
            for fname, _, text, _ in jobs:
                print(fname, '|', text)
            return 0
        os.makedirs(a.out, exist_ok=True)
        with open(os.path.join(a.out, 'subs.json'), 'w', encoding='utf-8') as f:
            json.dump(subs_doc(content), f, ensure_ascii=False, separators=(',', ':'))
        if jobs:
            if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
                raise Fail('ffmpeg/ffprobe required')
            done = synth_jobs(jobs, a.out)
            write_manifest(manifest_path, {n: h for n, h in {**man, **done}.items() if n in cur})
        return 0
    except Fail as e:
        print('error:', e, file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
