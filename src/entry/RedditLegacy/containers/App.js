import { useRef, useState, useEffect } from "react";
import styled from "@emotion/styled";
import { Global, css } from "@emotion/react";

import { getElementOrMake } from "@/util";

const __id = `chrome-reddit-live-app`;
const __TITLE = document.title;
const RELOAD_TIME = 30;

export function getRoot() {
  const elemRoot = getElementOrMake(__id);
  const elemParent = document.querySelector(
    ".commentarea .sitetable.nestedlisting"
  );
  elemParent.innerHTML = "";
  elemParent.appendChild(elemRoot);
  return elemRoot;
}

const StyledControls = styled.div`
  padding: 5px;
  border: 1px solid #5f99cf;
  background-color: #eff7ff;
  font-family: arial, helvetica, sans-serif;
  font-size: larger;
  border-radius: 3px;
  display: inline-block;
  margin-bottom: 20px;
  margin-left: 15px;
`;

async function fetchNewCommentsDoc() {
  const url = new URL(window.location.href);
  url.searchParams.set("sort", "new");
  url.searchParams.set("__t", Date.now());
  const response = await fetch(url);
  return await response.text();
}

function highlightComments(comments) {
  return comments.map((comment) => {
    comment.classList.add("ExtRedditLive__comment");
    comment.classList.add("ExtRedditLive__comment-highlight");
    return comment;
  });
}

function unhighlightComments() {
  Array.from(
    document.querySelectorAll(".ExtRedditLive__comment-highlight")
  ).forEach((comment) =>
    comment.classList.remove("ExtRedditLive__comment-highlight")
  );
}

function parseCommentsFromDoc(text) {
  const parser = new DOMParser();
  const htmlDoc = parser.parseFromString(text, "text/html");
  return htmlDoc.querySelectorAll(
    ".nestedlisting > .thing.comment:not(.deleted)"
  );
}

function getCommentDate(el) {
  return new Date(el.querySelector("time").getAttribute("datetime"));
}

function filterDeletedComments(elComments) {
  return elComments.filter(
    (elComment) => elComment.classList.contains("deleted") === false
  );
}

function filterUniqueComments(elComments) {
  return elComments.filter(
    (elComment, index, all) =>
      all.findIndex(
        (e) => e.getAttribute("id") === elComment.getAttribute("id")
      ) === index
  );
}

function sortCommentsByDate(elComments) {
  return elComments.sort((a, b) => getCommentDate(b) - getCommentDate(a));
}

function groupBySeenType(elComments, existingCommentIds) {
  return elComments.reduce(
    (acc, elComment) => {
      const commentId = elComment.dataset.fullname;

      if (existingCommentIds.has(commentId)) {
        acc.commentsUpdated.push(elComment);
      } else {
        acc.commentsNew.push(elComment);
      }

      return acc;
    },
    { commentsNew: [], commentsUpdated: [] }
  );
}

export function Container() {
  const [reloading, setReloading] = useState(true);
  const [time, setTime] = useState(RELOAD_TIME);
  const [totalNew, setTotalNew] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const intervalRef = useRef();
  const refComments = useRef();
  const blurHandler = useRef();
  const focusHandler = useRef();
  const reloadPromise = useRef();

  useEffect(() => {
    doReload("load");

    setIsFocused(document.hasFocus());

    blurHandler.current = window.addEventListener("blur", () => {
      setIsFocused(false);
    });

    focusHandler.current = window.addEventListener("focus", () => {
      unhighlightComments();
      setIsFocused(true);
    });

    return () => {
      window.removeEventListener("blur", blurHandler.current);
      window.removeEventListener("focus", focusHandler.current);
      intervalRef.current = clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    console.log('isfocused changed', { isFocused });
  }, [ isFocused ]);

  const updateTotalNew = (num) => {
    if (isFocused === true) {
      return;
    }

    setTotalNew((t) => t + num);
  };

  useEffect(() => {
    if (isFocused === true) {
      setTotalNew(null);
      document.title = __TITLE;
      return;
    }

    if (reloading) {
      document.title = `(...) ${__TITLE}`;
      return;
    }

    if (totalNew && totalNew > 0) {
      document.title = `(${totalNew}) ${__TITLE}`;
      return;
    }
  }, [isFocused, reloading, totalNew]);

  const updateExistingComments = (commentsUpdated) => {
    commentsUpdated.forEach((el) =>
      document.getElementById(el.id).replaceWith(el)
    );
  };

  const appendNewComments = (commentsNew) => {
    refComments.current.prepend(...commentsNew);
  };

  const getExistingCommentIds = () => {
    const els = document.querySelectorAll(".thing.comment");
    const values = Array.from(els).map((el) => el.dataset.fullname);

    return new Set(values);
  };

  const doReload = async (from) => {
    intervalRef.current = clearInterval(intervalRef.current);
    setReloading(true);
    await update();
    startCountdown();
  };

  const resetCounter = () => {
    intervalRef.current = clearInterval(intervalRef.current);
    setReloading(false);
    setTime(RELOAD_TIME);
  };

  const startCountdown = () => {
    resetCounter();

    intervalRef.current = setInterval(() => {
      setTime((t) => {
        if (t - 1 === 0) {
          doReload("timeout");

          return t;
        }
        return t - 1;
      });
    }, 1000);
  };

  const update = async () => {
    const existingCommentIds = getExistingCommentIds();
    let doc;

    if (!reloadPromise.current) {
      reloadPromise.current = fetchNewCommentsDoc();
    }

    try {
      const doc = await reloadPromise.current;
      const { commentsNew, commentsUpdated } =
        doc
        |> parseCommentsFromDoc(%)
        |> Array.from(%)
        |> filterDeletedComments(%)
        |> filterUniqueComments(%)
        |> sortCommentsByDate(%)
        |> groupBySeenType(%, existingCommentIds);

      commentsNew |> highlightComments(%) |> appendNewComments(%);

      if (isFocused) {
        setTimeout(() => {
          unhighlightComments();
        }, 2000);
      }

      updateExistingComments(commentsUpdated);
      updateTotalNew(commentsNew.length);
    } catch (e) {
      console.error(e);
    } finally {
      reloadPromise.current = null;
    }
  };

  return (
    <div>
      <Global
        styles={css`
          .ExtRedditLive__comment {
            background-color: transparent;
            transition: background-color 2s ease;
          }

          .ExtRedditLive__comment-highlight {
            background-color: #ffc !important;
          }
        `}
      />
      <StyledControls>
        <span>
          <strong>LIVE</strong> Mode Enabled
        </span>
        <button type="button">Stop</button>
        <button
          onClick={() => doReload("btn")}
          disabled={reloading}
          type="button"
        >
          {reloading ? "Loading ..." : `Reload (${time}s)`}
        </button>
      </StyledControls>
      <div ref={refComments} />
    </div>
  );
}
