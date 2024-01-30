import React from 'react'

import { getElementOrMake } from '@/util';

const __id = `chrome-reddit-live-menu-item`;

export function getRoot() {
  const elemRoot = getElementOrMake(__id);
  const elemParent = document.querySelector(".commentarea .drop-choices");
  elemParent.appendChild(elemRoot);
  return elemRoot;
}

export function Container({ onClick }) {
  const onClickMenuItem = (e) => {
    e.preventDefault();
    onClick();

    document.querySelector('.menuarea .selected').innerText = 'live';
  };

  return (
    <a href="#" onClick={onClickMenuItem} className="choice">
      live
    </a>
  );
}

