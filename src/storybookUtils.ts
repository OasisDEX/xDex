/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

export function ignoreDuringVisualRegression(storyCreator: () => any) {
  if (!navigator.userAgent.match(/HeadlessChrome/)) {
    storyCreator();
  }
}
