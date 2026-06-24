# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.3.0](https://github.com/Wildhoney/ReactWayfinder/compare/v0.2.0...v0.3.0) (2026-06-24)


### ⚠ BREAKING CHANGES

* split src/index.tsx into per-concept modules; trim public API to README surface
* redesign around Router(routes) + enum Routes, add router.params, replace redirect: with <Redirect />

* split src/index.tsx into per-concept modules; trim public API to README surface ([9b1b362](https://github.com/Wildhoney/ReactWayfinder/commit/9b1b3627cf74d9342aab537e16c1dcdc9fce9d6c))


### Features

* redesign around Router(routes) + enum Routes, add router.params, replace redirect: with <Redirect /> ([022712f](https://github.com/Wildhoney/ReactWayfinder/commit/022712f948f039f457dd44aac45498f781787510))

## [0.2.0](https://github.com/Wildhoney/ReactWayfinder/compare/v0.1.4...v0.2.0) (2026-06-17)


### ⚠ BREAKING CHANGES

* collapse urls into App({...}), add callable builders, navigate(href, Using)
* rename route `loader` to `data` for symmetry with `match` arg

* rename route `loader` to `data` for symmetry with `match` arg ([5018f13](https://github.com/Wildhoney/ReactWayfinder/commit/5018f135913cdb3d6127ea956bf838bdcc250cff))


### Features

* collapse urls into App({...}), add callable builders, navigate(href, Using) ([e2af223](https://github.com/Wildhoney/ReactWayfinder/commit/e2af22354be489305e93fbd95085ebc1556fe16c))

## [0.1.4](https://github.com/Wildhoney/ReactWayfinder/compare/v0.1.3...v0.1.4) (2026-05-26)


### Bug Fixes

* avoid double-prepending base path on router redirects ([635055d](https://github.com/Wildhoney/ReactWayfinder/commit/635055d6fd3a68682842f7688b7b0dfc3fd36e8b))

## [0.1.3](https://github.com/Wildhoney/ReactWayfinder/compare/v0.1.2...v0.1.3) (2026-05-01)

## [0.1.2](https://github.com/Wildhoney/ReactWayfinder/compare/v0.1.1...v0.1.2) (2026-05-01)


### Bug Fixes

* merge Router component and type via local alias to resolve TS2323 ([85c47eb](https://github.com/Wildhoney/ReactWayfinder/commit/85c47eb72fcb66cea2eb7d339e99d4d6872d6357))

## [0.1.1](https://github.com/Wildhoney/ReactWayfinder/compare/v0.1.0...v0.1.1) (2026-04-30)

## [0.1.0](https://github.com/Wildhoney/ReactWayfinder/compare/v0.0.4...v0.1.0) (2026-04-30)


### ⚠ BREAKING CHANGES

* add redirect prop and replace-mode navigation, rename component to match, pass router handle to callbacks

### Features

* add redirect prop and replace-mode navigation, rename component to match, pass router handle to callbacks ([c9fd8b6](https://github.com/Wildhoney/ReactWayfinder/commit/c9fd8b6d335ca027f01d0b186951be0b583be45f))


### Bug Fixes

* strip base path before passing pathname to Route active predicate ([52190ec](https://github.com/Wildhoney/ReactWayfinder/commit/52190ec1973fd4b5567aa8cd0b40248f1206ab90))
* update base path and badge URL for Wayfinder rename ([264570d](https://github.com/Wildhoney/ReactWayfinder/commit/264570debe565c4ca01c46568ac15ac0b70b6cd5))

## [0.0.4](https://github.com/Wildhoney/ReactWayfinder/compare/v0.0.3...v0.0.4) (2026-03-27)


### Features

* added demo to readme ([ccce82f](https://github.com/Wildhoney/ReactWayfinder/commit/ccce82fc092afe12ccf47e8641855a07716909fd))
* anchor elements use href only, reserve handler for buttons ([8d5e859](https://github.com/Wildhoney/ReactWayfinder/commit/8d5e859551923c000c05a330a08eaf7715adc6f3))

## [0.0.3](https://github.com/Wildhoney/ReactWayfinder/compare/v0.0.2...v0.0.3) (2026-03-27)

## 0.0.2 (2026-03-27)


### Features

* add base prop to Router for sub-path deployments ([ce8d6f0](https://github.com/Wildhoney/ReactWayfinder/commit/ce8d6f06c09e03cb6dc125bcf01eef1d0895754e))
* initial implementation ([e02b169](https://github.com/Wildhoney/ReactWayfinder/commit/e02b169cb7483de76f405aa3c4fb3ecfae601a73))
