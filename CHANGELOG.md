# Changelog

## [0.1.1](https://github.com/KMavr/tty-fold/compare/tty-fold-v0.1.0...tty-fold-v0.1.1) (2026-11-18)


### Bug Fixes

* **parser:** drop control characters a terminal does not display ([3379a14](https://github.com/KMavr/tty-fold/commit/3379a146cba3eeedbe1c977bceed1cfd7fa5c945))
* **screen:** clamp cursor moves to viewport bottom and max column ([0e6a8ed](https://github.com/KMavr/tty-fold/commit/0e6a8ed60230225fc0fede15f72766dbb4a3a7a0))


### Performance Improvements

* **screen:** make row allocation linear in tidy() ([af62f97](https://github.com/KMavr/tty-fold/commit/af62f97ebea3486cbd62c280911115a74df273bc))
* **screen:** store final rows as text to bound memory in tidy() ([0e10a68](https://github.com/KMavr/tty-fold/commit/0e10a68e80549fab4b1b1c8a3a9f28784eaf6836))
* skip parsing ignored CSI sequences and render lines in one pass ([5d38a8a](https://github.com/KMavr/tty-fold/commit/5d38a8a8579fa9d75292efd0da1f53ce8621739a))

## 0.1.0 (2026-11-18)


### Features

* add collapseRepeats option ([a59a126](https://github.com/KMavr/tty-fold/commit/a59a126e41202e703017574ddc8c7d5a7005f96f))
* add createTidyStream and height option ([a5096a2](https://github.com/KMavr/tty-fold/commit/a5096a27989d1328cdec3ba809567a3541db1051))
* strip ANSI styling ([5a69607](https://github.com/KMavr/tty-fold/commit/5a69607fd589904dc8f0e55d914c2f20fe06a911))
* support carriage return, backspace and erase in line ([a1bd087](https://github.com/KMavr/tty-fold/commit/a1bd0873ae7e9e48532a865a05cfc1f09bd44676))
* support cursor movement, erase in display and clear screen ([5aef5c1](https://github.com/KMavr/tty-fold/commit/5aef5c1ccf428140e879db5dfd4d71f9242f272f))


### Bug Fixes

* keep printed trailing spaces and drop trailing blank lines ([77ba515](https://github.com/KMavr/tty-fold/commit/77ba515ef0597f1c5cfd1d16636f6714c75f21ce))


### Miscellaneous Chores

* release 0.1.0 ([099738c](https://github.com/KMavr/tty-fold/commit/099738c190800ff159e4ab7e9a6d7e5def3d8b83))
