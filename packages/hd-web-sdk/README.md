# `@ukeyfe/hd-web-sdk`

`@ukeyfe/hd-web-sdk` is a browser implementation of hardware-sdk that creates an iframe and communicates with transport through the iframe to avoid cross-domain issues.

## Installation

Install library as npm module:

```javascript
npm install @ukeyfe/hd-web-sdk
```

or

```javascript
yarn add @ukeyfe/hd-web-sdk
```

## Initialization

```javascript
import { HardwareSDK } from '@ukeyfe/hd-web-sdk';

function init() {
  HardwareSDK.init({
    debug: false,
    connectSrc: 'https://jssdk.onekey.so/'
  });
}
```

## Docs

Documentation is available [hardware-js-sdk](https://developer.onekey.so/connect-to-hardware/hardware-sdk/start)
