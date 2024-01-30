import React from "react";
import { createRoot } from 'react-dom/client';

import { Reddit, RedditLegacy } from "@/entry";

function getTarget() {
  return document?.querySelector("html")?.classList?.contains("theme-beta")
    ? Reddit
    : RedditLegacy;
}

function bootstrap() {
  const target = getTarget();

  if (!target) {
    console.log("could not find entry");
    return;
  }

  const { root, Main } = target.entry();
  const appRoot = createRoot(root);

  appRoot.render(<Main />);
}

bootstrap();
