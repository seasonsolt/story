import { checkVoiceManifest, checkAudioFiles } from '../content_keys.mjs';

export function realGameAudioFilesAndManifestAreInSync({ assert }) {
  const fileProbs = checkAudioFiles('game');
  assert.deepEqual(fileProbs, [], fileProbs.join('\n'));
  const manProbs = checkVoiceManifest('game');
  assert.deepEqual(manProbs, [], manProbs.join('\n'));
}
