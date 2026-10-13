// t12 沙箱兼容 shim（2026-10-13）——仅影响加载本文件的那个 node 进程（经 NODE_OPTIONS --require 注入）。
// 实证（见 phase0-regression.log §2/§2a/§2b + python 对照组）：本环境内任何**非 shell 进程**
// （node、python3）的 rename(2) 一律返回 EXDEV（errno 18），而 shell 的 mv 对同一路径对正常工作；
// rename 两侧 stat 设备号相同（/dev/vda2，Docker overlayfs）。判定为沙箱对非 shell 进程
// rename 系统调用的拦截行为，**不是源码或 astro 的缺陷**——astro build 的最后一步
// ssrMoveAssets（static-build.js:334，fs.promises.rename 移动 .prerender/_astro → dist/_astro）
// 必然在此环境失败。
// 本 shim：优先走原生 rename；仅当内核/沙箱返回 EXDEV 时，用 复制+删除 模拟同文件系统 rename
// （行为等效：目标存在则覆盖、源被移除；差异：非原子，本场景无并发读者）。不改任何源文件。
'use strict';
const fs = require('fs');
const origSync = fs.renameSync;
const origProm = fs.promises.rename;

function emuSync(src, dest) {
  fs.cpSync(src, dest, { force: true, dereference: false });
  fs.rmSync(src, { recursive: true, force: true });
}
async function emuProm(src, dest) {
  await fs.promises.cp(src, dest, { force: true, dereference: false });
  await fs.promises.rm(src, { recursive: true, force: true });
}

fs.renameSync = function (src, dest, opts) {
  try {
    return origSync.call(this, src, dest, opts);
  } catch (e) {
    if (e && e.code === 'EXDEV') return emuSync(src, dest);
    throw e;
  }
};
fs.promises.rename = function (src, dest, opts) {
  return origProm
    .call(this, src, dest, opts)
    .catch((e) => {
      if (e && e.code === 'EXDEV') return emuProm(src, dest);
      throw e;
    });
};
