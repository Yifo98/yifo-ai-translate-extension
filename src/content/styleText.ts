export const toolbarStyles = `
  #browser-translator-toolbar {
    position: fixed;
    top: var(--bt-launcher-top, 156px);
    right: 18px;
    left: auto;
    z-index: 2147483647;
    width: 348px;
    pointer-events: none;
    font-family: "IBM Plex Sans", "Noto Sans SC", "PingFang SC", sans-serif;
  }

  #browser-translator-toolbar[data-launcher-side="left"] {
    left: 18px;
    right: auto;
  }

  #browser-translator-toolbar[data-launcher-side="right"] {
    left: auto;
    right: 18px;
  }

  #browser-translator-toolbar[data-mode="off"] {
    display: none;
  }

  #browser-translator-toolbar .bt-panel,
  #browser-translator-toolbar .bt-launcher {
    pointer-events: auto;
  }

  #browser-translator-toolbar .bt-panel {
    position: relative;
    overflow: hidden;
    max-height: calc(100vh - var(--bt-launcher-top, 156px) - 14px);
    overflow-y: auto;
    border-radius: 28px;
    background:
      radial-gradient(circle at top left, rgba(38, 203, 255, 0.18), transparent 40%),
      radial-gradient(circle at bottom right, rgba(70, 193, 160, 0.18), transparent 34%),
      linear-gradient(180deg, rgba(11, 36, 58, 0.98), rgba(14, 82, 104, 0.92));
    border: 1px solid rgba(110, 216, 255, 0.18);
    box-shadow:
      0 24px 60px rgba(7, 16, 33, 0.36),
      inset 0 1px 0 rgba(255, 255, 255, 0.14);
    color: #ecfeff;
    backdrop-filter: blur(18px);
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  #browser-translator-toolbar .bt-panel::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(120deg, rgba(80, 205, 255, 0.08), transparent 36%, rgba(255, 205, 92, 0.06)),
      linear-gradient(rgba(255, 255, 255, 0.024) 1px, transparent 1px);
    background-size: auto, 100% 12px;
    opacity: 0.52;
    pointer-events: none;
  }

  #browser-translator-toolbar[data-mode="launcher"] .bt-panel {
    opacity: 0;
    transform: translateX(26px) scale(0.96);
    pointer-events: none;
  }

  #browser-translator-toolbar[data-mode="launcher"][data-launcher-side="left"] .bt-panel {
    transform: translateX(-26px) scale(0.96);
  }

  #browser-translator-toolbar .bt-header {
    position: relative;
    z-index: 1;
    padding: 16px 18px 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  #browser-translator-toolbar .bt-brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  #browser-translator-toolbar .bt-header strong {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.03em;
  }

  #browser-translator-toolbar .bt-pill {
    border-radius: 999px;
    background: rgba(20, 50, 76, 0.56);
    border: 1px solid rgba(132, 215, 255, 0.18);
    padding: 5px 10px;
    font-size: 11px;
    color: #dbeafe;
  }

  #browser-translator-toolbar .bt-toggle {
    appearance: none;
    border: 1px solid rgba(120, 214, 255, 0.18);
    border-radius: 999px;
    background: rgba(28, 70, 97, 0.44);
    color: #d7f9ff;
    padding: 7px 12px;
    font: inherit;
    font-size: 11px;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
  }

  #browser-translator-toolbar .bt-toggle:hover {
    transform: translateY(-1px);
    background: rgba(53, 130, 173, 0.28);
    border-color: rgba(132, 215, 255, 0.3);
  }

  #browser-translator-toolbar .bt-body {
    position: relative;
    z-index: 1;
    padding: 0 18px 16px;
    display: grid;
    gap: 11px;
  }

  #browser-translator-toolbar .bt-status {
    padding: 12px 14px;
    border-radius: 18px;
    background: rgba(8, 33, 53, 0.54);
    border: 1px solid rgba(112, 210, 255, 0.08);
    font-size: 12px;
    line-height: 1.5;
    color: rgba(236, 254, 255, 0.92);
  }

  #browser-translator-toolbar .bt-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  #browser-translator-toolbar button {
    appearance: none;
    border: 1px solid rgba(133, 207, 240, 0.1);
    border-radius: 16px;
    background: rgba(87, 124, 142, 0.24);
    color: inherit;
    padding: 11px 12px;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition:
      transform 0.18s ease,
      background 0.18s ease,
      opacity 0.18s ease,
      border-color 0.18s ease;
  }

  #browser-translator-toolbar button:hover {
    transform: translateY(-1px);
    background: rgba(100, 146, 166, 0.3);
  }

  #browser-translator-toolbar button[data-tone="primary"] {
    background: linear-gradient(135deg, #47cfff, #ffd43c);
    color: #0f172a;
    font-weight: 700;
    border-color: transparent;
  }

  #browser-translator-toolbar button[data-tone="warning"] {
    background: rgba(115, 128, 92, 0.4);
    color: #ffdf9c;
  }

  #browser-translator-toolbar button[data-active="true"] {
    background: rgba(48, 120, 156, 0.34);
    border-color: rgba(103, 232, 249, 0.22);
  }

  #browser-translator-toolbar .bt-launcher {
    position: absolute;
    top: 0;
    right: 0;
    left: auto;
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    padding: 0;
    border-radius: 16px;
    background: transparent;
    border: 0;
    box-shadow: 0 18px 34px rgba(15, 23, 42, 0.14);
    color: #f8fafc;
    cursor: grab;
    touch-action: none;
    user-select: none;
    transition:
      opacity 0.2s ease,
      transform 0.2s ease,
      box-shadow 0.2s ease,
      border-color 0.2s ease;
  }

  #browser-translator-toolbar[data-launcher-side="left"] .bt-launcher {
    left: 0;
    right: auto;
  }

  #browser-translator-toolbar .bt-launcher[data-dragging="true"] {
    cursor: grabbing;
    transition: none;
  }

  #browser-translator-toolbar[data-mode="panel"] .bt-launcher,
  #browser-translator-toolbar[data-mode="off"] .bt-launcher {
    opacity: 0;
    transform: translateX(12px);
    pointer-events: none;
  }

  #browser-translator-toolbar[data-mode="launcher"] .bt-launcher {
    opacity: 1;
    transform: translateX(0);
  }

  #browser-translator-toolbar[data-mode="launcher"][data-launcher-collapsed="true"][data-launcher-side="right"] .bt-launcher:not([data-dragging="true"]) {
    transform: translateX(24px);
    opacity: 0.72;
  }

  #browser-translator-toolbar[data-mode="launcher"][data-launcher-collapsed="true"][data-launcher-side="left"] .bt-launcher:not([data-dragging="true"]) {
    transform: translateX(-24px);
    opacity: 0.72;
  }

  #browser-translator-toolbar[data-mode="launcher"][data-launcher-collapsed="true"] .bt-launcher:hover,
  #browser-translator-toolbar[data-mode="launcher"][data-launcher-collapsed="true"] .bt-launcher:focus-visible {
    transform: translateX(0) scale(1.03) !important;
    opacity: 1;
  }

  #browser-translator-toolbar .bt-launcher-mark {
    position: absolute;
    right: -4px;
    bottom: -4px;
    z-index: 1;
    display: grid;
    place-items: center;
    width: 17px;
    height: 17px;
    border-radius: 999px;
    background: linear-gradient(135deg, #53e3ee, #ffe15a);
    border: 1px solid rgba(236, 254, 255, 0.56);
    color: #061827;
    font-size: 11px;
    font-weight: 900;
    line-height: 1;
    box-shadow: 0 8px 18px rgba(8, 15, 35, 0.26);
  }

  #browser-translator-toolbar .bt-launcher-mark:empty {
    opacity: 0;
    transform: scale(0.5);
  }

  #browser-translator-toolbar .bt-launcher-icon {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border-radius: inherit;
    opacity: 1;
    object-fit: contain;
    pointer-events: none;
  }

  #browser-translator-toolbar .bt-launcher-glow {
    position: absolute;
    inset: -4px;
    border-radius: 20px;
    background: radial-gradient(circle, rgba(15, 23, 42, 0.1), transparent 68%);
    pointer-events: none;
  }

  #browser-translator-toolbar .bt-launcher[data-state="ready"] {
    box-shadow:
      0 18px 32px rgba(8, 15, 35, 0.26),
      0 0 0 1px rgba(52, 211, 153, 0.08);
  }

  #browser-translator-toolbar .bt-launcher[data-state="loading"] {
    box-shadow:
      0 18px 34px rgba(8, 15, 35, 0.28),
      0 0 0 6px rgba(34, 211, 238, 0.08);
  }

  #browser-translator-toolbar .bt-launcher[data-state="loading"] .bt-launcher-mark {
    opacity: 1;
    transform: none;
    border: 2px solid rgba(236, 254, 255, 0.88);
    border-top-color: transparent;
    background: rgba(8, 47, 73, 0.86);
    color: transparent;
    animation: browser-translator-launcher-spin 0.8s linear infinite;
  }

  html[data-browser-translator-card-style="edge"] .browser-translator-target,
  .browser-translator-target {
    margin-top: 6px;
    padding: 2px 0 0 10px;
    border-radius: 0;
    background: transparent;
    border-left: 2px solid rgba(34, 211, 238, 0.34);
    color: #67e8f9 !important;
    -webkit-text-fill-color: #67e8f9 !important;
    font-family: "IBM Plex Sans", "Noto Sans SC", "PingFang SC", sans-serif;
    font-size: max(0.92em, 13px);
    font-weight: 520;
    line-height: 1.55;
    white-space: pre-wrap;
    box-shadow: none;
    animation: browser-translator-fade-in 0.18s ease;
  }

  html[data-browser-translator-page-tone="light"][data-browser-translator-card-style="edge"] .browser-translator-target,
  html[data-browser-translator-page-tone="light"] .browser-translator-target {
    border-left-color: rgba(2, 132, 199, 0.48);
    color: #075985 !important;
    -webkit-text-fill-color: #075985 !important;
    text-shadow: none !important;
  }

  html[data-browser-translator-page-tone="light"] .browser-translator-target[data-render-mode="inline"] {
    color: #075985 !important;
    -webkit-text-fill-color: currentColor !important;
    opacity: 0.96 !important;
    text-shadow: none !important;
  }

  html[data-browser-translator-page-tone="light"] .browser-translator-inline-source-swapped > .browser-translator-target[data-render-mode="inline"] {
    color: #0f172a !important;
    -webkit-text-fill-color: currentColor !important;
  }

  html[data-browser-translator-card-style="glass"] .browser-translator-target {
    padding: 8px 12px;
    border-radius: 16px;
    border-left: none;
    border: 1px solid rgba(56, 189, 248, 0.18);
    background:
      linear-gradient(135deg, rgba(14, 32, 52, 0.72), rgba(10, 24, 40, 0.62)),
      rgba(9, 18, 30, 0.58);
    box-shadow: 0 10px 24px rgba(8, 47, 73, 0.12);
  }

  html[data-browser-translator-page-tone="light"][data-browser-translator-card-style="glass"] .browser-translator-target {
    border-color: rgba(14, 116, 144, 0.16);
    background:
      linear-gradient(135deg, rgba(240, 249, 255, 0.92), rgba(255, 255, 255, 0.78)),
      rgba(255, 255, 255, 0.74);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  }

  .browser-translator-target[data-render-mode="inline"] {
    all: unset !important;
    box-sizing: border-box !important;
    padding: 0 !important;
    border: none !important;
    border-radius: 0 !important;
    background: none !important;
    box-shadow: none !important;
    color: #bfe9ff !important;
    -webkit-text-fill-color: currentColor !important;
    font-family: "IBM Plex Sans", "Noto Sans SC", "PingFang SC", sans-serif !important;
    font-size: max(0.88em, 12.2px) !important;
    font-weight: 560 !important;
    line-height: 1.42 !important;
    letter-spacing: 0 !important;
    white-space: normal !important;
    word-break: keep-all !important;
    overflow-wrap: anywhere !important;
    writing-mode: horizontal-tb !important;
    text-orientation: mixed !important;
    text-align: left !important;
    opacity: 0.94 !important;
    text-shadow: 0 0 8px rgba(14, 165, 233, 0.16) !important;
  }

  .browser-translator-target[data-render-mode="inline"][data-inline-layout="flow"] {
    display: inline-flex !important;
    align-items: baseline !important;
    gap: 0 !important;
    margin: 0 0 0 4px !important;
    max-inline-size: min(10em, 54%) !important;
    vertical-align: middle !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    flex: 0 1 auto !important;
    min-width: 0 !important;
  }

  .browser-translator-target[data-render-mode="inline"][data-inline-layout="flow"]::before {
    content: none !important;
  }

  .browser-translator-target[data-render-mode="inline"][data-inline-layout="overlay"] {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    position: absolute !important;
    left: 50% !important;
    top: calc(100% - 2px) !important;
    z-index: 3 !important;
    max-width: min(168px, calc(100vw - 32px)) !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 2px 7px !important;
    border-radius: 999px !important;
    background: rgba(2, 12, 27, 0.84) !important;
    border: 1px solid rgba(125, 211, 252, 0.18) !important;
    box-shadow: 0 8px 18px rgba(2, 6, 23, 0.18) !important;
    color: #9be8ff !important;
    -webkit-text-fill-color: currentColor !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    line-height: 1.2 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    pointer-events: none !important;
    transform: translateX(-50%) !important;
    text-shadow: none !important;
  }

  html[data-browser-translator-page-tone="light"] .browser-translator-target[data-render-mode="inline"][data-inline-layout="overlay"] {
    background: rgba(255, 255, 255, 0.96) !important;
    border-color: rgba(14, 116, 144, 0.2) !important;
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12) !important;
    color: #075985 !important;
  }

  .browser-translator-target[data-render-mode="inline"][data-inline-layout="stacked"] {
    display: block !important;
    margin: 3px 0 0 !important;
    line-height: 1.36 !important;
    white-space: normal !important;
    text-wrap: balance !important;
    text-align: left !important;
    align-self: flex-start !important;
  }

  button[data-browser-translator-inline-layout="stacked"],
  a[data-browser-translator-inline-layout="stacked"],
  label[data-browser-translator-inline-layout="stacked"],
  [role="button"][data-browser-translator-inline-layout="stacked"],
  [role="link"][data-browser-translator-inline-layout="stacked"],
  [role="tab"][data-browser-translator-inline-layout="stacked"],
  [role="menuitem"][data-browser-translator-inline-layout="stacked"],
  [role="menuitemcheckbox"][data-browser-translator-inline-layout="stacked"],
  [role="menuitemradio"][data-browser-translator-inline-layout="stacked"],
  [role="option"][data-browser-translator-inline-layout="stacked"] {
    flex-wrap: wrap !important;
    row-gap: 3px !important;
  }

  button > .browser-translator-target[data-render-mode="inline"][data-inline-layout="stacked"],
  a > .browser-translator-target[data-render-mode="inline"][data-inline-layout="stacked"],
  label > .browser-translator-target[data-render-mode="inline"][data-inline-layout="stacked"],
  [role="button"] > .browser-translator-target[data-render-mode="inline"][data-inline-layout="stacked"],
  [role="link"] > .browser-translator-target[data-render-mode="inline"][data-inline-layout="stacked"],
  [role="tab"] > .browser-translator-target[data-render-mode="inline"][data-inline-layout="stacked"],
  [role="menuitem"] > .browser-translator-target[data-render-mode="inline"][data-inline-layout="stacked"],
  [role="menuitemcheckbox"] > .browser-translator-target[data-render-mode="inline"][data-inline-layout="stacked"],
  [role="menuitemradio"] > .browser-translator-target[data-render-mode="inline"][data-inline-layout="stacked"],
  [role="option"] > .browser-translator-target[data-render-mode="inline"][data-inline-layout="stacked"] {
    flex-basis: 100% !important;
    width: 100% !important;
    min-width: 0 !important;
    margin-top: 2px !important;
    font-size: 12.2px !important;
    line-height: 1.36 !important;
    text-align: inherit !important;
  }

  button > .browser-translator-target[data-render-mode="inline"][data-inline-layout="flow"],
  a > .browser-translator-target[data-render-mode="inline"][data-inline-layout="flow"],
  label > .browser-translator-target[data-render-mode="inline"][data-inline-layout="flow"],
  [role="button"] > .browser-translator-target[data-render-mode="inline"][data-inline-layout="flow"],
  [role="link"] > .browser-translator-target[data-render-mode="inline"][data-inline-layout="flow"],
  [role="tab"] > .browser-translator-target[data-render-mode="inline"][data-inline-layout="flow"],
  [role="menuitem"] > .browser-translator-target[data-render-mode="inline"][data-inline-layout="flow"],
  [role="menuitemcheckbox"] > .browser-translator-target[data-render-mode="inline"][data-inline-layout="flow"],
  [role="menuitemradio"] > .browser-translator-target[data-render-mode="inline"][data-inline-layout="flow"],
  [role="option"] > .browser-translator-target[data-render-mode="inline"][data-inline-layout="flow"] {
    font-size: max(0.84em, 11.4px) !important;
    line-height: 1.3 !important;
    opacity: 0.88 !important;
  }

  button[data-browser-translator-inline-layout="overlay"],
  a[data-browser-translator-inline-layout="overlay"],
  label[data-browser-translator-inline-layout="overlay"],
  [role="button"][data-browser-translator-inline-layout="overlay"],
  [role="link"][data-browser-translator-inline-layout="overlay"],
  [role="tab"][data-browser-translator-inline-layout="overlay"],
  [role="menuitem"][data-browser-translator-inline-layout="overlay"],
  [role="menuitemcheckbox"][data-browser-translator-inline-layout="overlay"],
  [role="menuitemradio"][data-browser-translator-inline-layout="overlay"],
  [role="option"][data-browser-translator-inline-layout="overlay"] {
    position: relative !important;
    overflow: visible !important;
  }

  :is(
    [role="menu"],
    [role="listbox"],
    [role="dialog"],
    [aria-modal="true"],
    [aria-label$="menu" i],
    [data-radix-popper-content-wrapper],
    [data-radix-dropdown-menu-content],
    [data-radix-select-content],
    [data-headlessui-portal],
    [data-radix-portal]
  ) .browser-translator-target[data-render-mode="inline"] {
    display: inline-flex !important;
    margin: 0 0 0 6px !important;
    font-size: max(0.86em, 12px) !important;
    line-height: 1.24 !important;
    color: #c7f2ff !important;
    opacity: 0.84 !important;
    text-wrap: nowrap !important;
    white-space: nowrap !important;
  }

  :is(
    [role="menu"],
    [role="listbox"],
    [role="dialog"],
    [aria-modal="true"],
    [aria-label$="menu" i],
    [data-radix-popper-content-wrapper],
    [data-radix-dropdown-menu-content],
    [data-radix-select-content],
    [data-headlessui-portal],
    [data-radix-portal]
  ) .browser-translator-target[data-render-mode="inline"][data-inline-layout="stacked"] {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 2px 0 0 !important;
    line-height: 1.32 !important;
    white-space: normal !important;
    text-wrap: balance !important;
    opacity: 0.86 !important;
  }

  :is(
    [role="menu"],
    [role="listbox"],
    [role="dialog"],
    [aria-modal="true"],
    [aria-label$="menu" i],
    [data-radix-popper-content-wrapper],
    [data-radix-dropdown-menu-content],
    [data-radix-select-content],
    [data-headlessui-portal],
    [data-radix-portal]
  ) .browser-translator-target[data-render-mode="block"] {
    margin-top: 4px;
    padding-left: 8px;
    font-size: max(0.84em, 11.6px);
    line-height: 1.4;
  }

  a[href*="/song/"][data-browser-translator-source="true"] + .browser-translator-target[data-render-mode="block"] {
    display: -webkit-box !important;
    max-width: 100% !important;
    margin: 2px 0 0 !important;
    padding: 0 !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    color: #7dd3fc !important;
    -webkit-text-fill-color: #7dd3fc !important;
    font-size: max(0.84em, 11.4px) !important;
    font-weight: 650 !important;
    line-height: 1.28 !important;
    letter-spacing: 0 !important;
    white-space: normal !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    -webkit-line-clamp: 2 !important;
    -webkit-box-orient: vertical !important;
    text-shadow: 0 0 8px rgba(14, 165, 233, 0.18) !important;
  }

  button[data-browser-translator-inline-layout="flow"],
  a[data-browser-translator-inline-layout="flow"],
  label[data-browser-translator-inline-layout="flow"],
  [role="button"][data-browser-translator-inline-layout="flow"],
  [role="link"][data-browser-translator-inline-layout="flow"],
  [role="tab"][data-browser-translator-inline-layout="flow"],
  [role="menuitem"][data-browser-translator-inline-layout="flow"],
  [role="menuitemcheckbox"][data-browser-translator-inline-layout="flow"],
  [role="menuitemradio"][data-browser-translator-inline-layout="flow"],
  [role="option"][data-browser-translator-inline-layout="flow"] {
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    align-items: center !important;
    align-content: center !important;
    justify-content: flex-start !important;
    column-gap: 3px !important;
    row-gap: 0 !important;
  }

  button[data-browser-translator-source="true"][data-browser-translator-inline-layout="stacked"],
  a[data-browser-translator-source="true"][data-browser-translator-inline-layout="stacked"],
  label[data-browser-translator-source="true"][data-browser-translator-inline-layout="stacked"],
  [role="button"][data-browser-translator-source="true"][data-browser-translator-inline-layout="stacked"],
  [role="link"][data-browser-translator-source="true"][data-browser-translator-inline-layout="stacked"],
  [role="tab"][data-browser-translator-source="true"][data-browser-translator-inline-layout="stacked"],
  [role="menuitem"][data-browser-translator-source="true"][data-browser-translator-inline-layout="stacked"],
  [role="menuitemcheckbox"][data-browser-translator-source="true"][data-browser-translator-inline-layout="stacked"],
  [role="menuitemradio"][data-browser-translator-source="true"][data-browser-translator-inline-layout="stacked"],
  [role="option"][data-browser-translator-source="true"][data-browser-translator-inline-layout="stacked"],
  button[data-browser-translator-source="true"][data-browser-translator-inline-layout="overlay"],
  a[data-browser-translator-source="true"][data-browser-translator-inline-layout="overlay"],
  label[data-browser-translator-source="true"][data-browser-translator-inline-layout="overlay"],
  [role="button"][data-browser-translator-source="true"][data-browser-translator-inline-layout="overlay"],
  [role="link"][data-browser-translator-source="true"][data-browser-translator-inline-layout="overlay"],
  [role="tab"][data-browser-translator-source="true"][data-browser-translator-inline-layout="overlay"],
  [role="menuitem"][data-browser-translator-source="true"][data-browser-translator-inline-layout="overlay"],
  [role="menuitemcheckbox"][data-browser-translator-source="true"][data-browser-translator-inline-layout="overlay"],
  [role="menuitemradio"][data-browser-translator-source="true"][data-browser-translator-inline-layout="overlay"],
  [role="option"][data-browser-translator-source="true"][data-browser-translator-inline-layout="overlay"] {
    height: auto !important;
    max-height: none !important;
    min-height: 32px !important;
    overflow: visible !important;
  }

  :is(
    [role="menu"],
    [role="listbox"],
    [role="dialog"],
    [aria-modal="true"],
    [aria-label$="menu" i],
    [data-radix-popper-content-wrapper],
    [data-radix-dropdown-menu-content],
    [data-radix-select-content],
    [data-headlessui-portal],
    [data-radix-portal]
  ) :is(
    button,
    a,
    label,
    [role="button"],
    [role="link"],
    [role="tab"],
    [role="menuitem"],
    [role="menuitemcheckbox"],
    [role="menuitemradio"],
    [role="option"]
  )[data-browser-translator-source="true"] {
    min-height: 0 !important;
    align-items: center !important;
    row-gap: 1px !important;
  }

  .browser-translator-source-hidden {
    display: none !important;
  }

  .browser-translator-inline-source-muted {
    color: transparent !important;
    -webkit-text-fill-color: transparent !important;
    text-shadow: none !important;
  }

  .browser-translator-inline-source-muted > :not(.browser-translator-target[data-render-mode="inline"]) {
    visibility: hidden !important;
  }

  .browser-translator-inline-source-muted > .browser-translator-target[data-render-mode="inline"] {
    visibility: visible !important;
  }

  .browser-translator-inline-source-swapped {
    color: transparent !important;
    -webkit-text-fill-color: transparent !important;
    text-shadow: none !important;
    font-size: 0 !important;
  }

  .browser-translator-inline-source-swapped > :not(.browser-translator-target[data-render-mode="inline"]) {
    display: none !important;
  }

  .browser-translator-inline-source-swapped > .browser-translator-target[data-render-mode="inline"] {
    display: inline-flex !important;
    width: auto !important;
    max-width: 100% !important;
    margin: 0 !important;
    vertical-align: middle !important;
    color: #e6faff !important;
    -webkit-text-fill-color: currentColor !important;
    text-shadow: none !important;
  }

  .browser-translator-inline-source-swapped > .browser-translator-target[data-render-mode="inline"][data-inline-layout="overlay"] {
    position: static !important;
    inset: auto !important;
    transform: none !important;
    max-width: 100% !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    color: #e6faff !important;
    font-size: max(0.92em, 12.4px) !important;
    line-height: 1.35 !important;
    white-space: normal !important;
    text-overflow: clip !important;
    overflow: visible !important;
  }

  .browser-translator-inline-source-swapped :not(.browser-translator-target):not(.browser-translator-target *):not(svg):not(svg *):not(path):not(img):not(picture):not(video):not(canvas):not(use) {
    color: transparent !important;
    -webkit-text-fill-color: transparent !important;
    text-shadow: none !important;
  }

  .browser-translator-inline-source-swapped :not(.browser-translator-target):not(.browser-translator-target *):not(svg):not(svg *):not(path):not(img):not(picture):not(video):not(canvas):not(use):not(br) {
    font-size: 0 !important;
  }

  .browser-translator-inline-source-swapped > .browser-translator-target[data-render-mode="inline"][data-inline-layout="flow"]::before {
    content: none !important;
  }

  button.browser-translator-inline-source-swapped > .browser-translator-target[data-render-mode="inline"],
  a.browser-translator-inline-source-swapped > .browser-translator-target[data-render-mode="inline"],
  label.browser-translator-inline-source-swapped > .browser-translator-target[data-render-mode="inline"],
  [role="button"].browser-translator-inline-source-swapped > .browser-translator-target[data-render-mode="inline"],
  [role="link"].browser-translator-inline-source-swapped > .browser-translator-target[data-render-mode="inline"],
  [role="tab"].browser-translator-inline-source-swapped > .browser-translator-target[data-render-mode="inline"],
  [role="menuitem"].browser-translator-inline-source-swapped > .browser-translator-target[data-render-mode="inline"],
  [role="menuitemcheckbox"].browser-translator-inline-source-swapped > .browser-translator-target[data-render-mode="inline"],
  [role="menuitemradio"].browser-translator-inline-source-swapped > .browser-translator-target[data-render-mode="inline"],
  [role="option"].browser-translator-inline-source-swapped > .browser-translator-target[data-render-mode="inline"] {
    font-size: max(0.92em, 12.8px) !important;
    line-height: 1.4 !important;
    white-space: normal !important;
    text-wrap: balance !important;
  }

  html[data-browser-translator-page-tone="light"] .browser-translator-target,
  html[data-browser-translator-page-tone="light"] .browser-translator-target[data-render-mode="inline"],
  html[data-browser-translator-page-tone="light"] :is(
    [role="menu"],
    [role="listbox"],
    [role="dialog"],
    [aria-modal="true"],
    [aria-label$="menu" i],
    [data-radix-popper-content-wrapper],
    [data-radix-dropdown-menu-content],
    [data-radix-select-content],
    [data-headlessui-portal],
    [data-radix-portal]
  ) .browser-translator-target[data-render-mode="inline"] {
    color: #075985 !important;
    -webkit-text-fill-color: currentColor !important;
    text-shadow: none !important;
    opacity: 0.98 !important;
  }

  html[data-browser-translator-page-tone="light"] .browser-translator-target[data-render-mode="block"],
  html[data-browser-translator-page-tone="light"] a[href*="/song/"][data-browser-translator-source="true"] + .browser-translator-target[data-render-mode="block"] {
    color: #075985 !important;
    -webkit-text-fill-color: #075985 !important;
    border-left-color: rgba(2, 132, 199, 0.48) !important;
    text-shadow: none !important;
  }

  html[data-browser-translator-page-tone="light"] .browser-translator-inline-source-swapped > .browser-translator-target[data-render-mode="inline"] {
    color: #0f172a !important;
    -webkit-text-fill-color: currentColor !important;
  }

  :is(
    header,
    nav,
    [role="navigation"],
    [data-color-mode="dark"],
    [data-theme*="dark" i],
    .Header,
    .AppHeader,
    .AppHeader-globalBar,
    .AppHeader-localBar,
    .js-header-wrapper
  ) .browser-translator-target[data-render-mode="inline"] {
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
    color: #7dd3fc !important;
    -webkit-text-fill-color: currentColor !important;
    text-shadow: 0 0 8px rgba(14, 165, 233, 0.18) !important;
    opacity: 0.96 !important;
  }

  :is(
    header,
    nav,
    [role="navigation"],
    [data-color-mode="dark"],
    [data-theme*="dark" i],
    .Header,
    .AppHeader,
    .AppHeader-globalBar,
    .AppHeader-localBar,
    .js-header-wrapper
  ) .browser-translator-target[data-render-mode="inline"][data-inline-layout="overlay"] {
    position: static !important;
    inset: auto !important;
    transform: none !important;
    max-width: 100% !important;
    margin: 0 0 0 4px !important;
    padding: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    pointer-events: none !important;
  }

  :is(
    header,
    nav,
    [role="navigation"],
    [data-color-mode="dark"],
    [data-theme*="dark" i],
    .Header,
    .AppHeader,
    .AppHeader-globalBar,
    .AppHeader-localBar,
    .js-header-wrapper
  ) .browser-translator-inline-source-swapped > .browser-translator-target[data-render-mode="inline"] {
    color: #f8fafc !important;
    -webkit-text-fill-color: currentColor !important;
    font-size: max(0.86em, 12px) !important;
    line-height: 1.25 !important;
    text-shadow: none !important;
  }

  @keyframes browser-translator-fade-in {
    from {
      opacity: 0;
      transform: translateY(3px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes browser-translator-launcher-spin {
    to {
      transform: rotate(360deg);
    }
  }
`
