  /* Pure play-state predicate & voice playback wrapper. */
  function canPlay() { return playFlow.phase === 'play' && game.state === 'play' && !storyIsOpen() && !uxState.modal && !isPortraitView(); }
