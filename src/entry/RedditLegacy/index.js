import { useState } from "react";
import ReactDOM from "react-dom";

import * as AppContainer from "./containers/App";
import * as MenuItemContainer from "./containers/MenuItem";

function Main() {
  const [shouldShow, setShouldShow] = useState(false);

  return (
    <>
      {ReactDOM.createPortal(
        <MenuItemContainer.Container onClick={() => setShouldShow(true)} />,
        MenuItemContainer.getRoot()
      )}

      {shouldShow &&
        ReactDOM.createPortal(
          <AppContainer.Container onHide={() => setShouldShow(false)} />,
          AppContainer.getRoot()
        )}
    </>
  );
}

export function entry() {
  const root = document.createElement("div");
  document.body.appendChild(root);
  return { Main, root };
}
