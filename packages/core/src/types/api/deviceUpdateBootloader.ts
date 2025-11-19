import { Success } from '@ukeyfe/hd-transport';
import type { Response } from '../params';

export declare function deviceUpdateBootloader(
  connectId: string,
  params?: {
    binary?: ArrayBuffer;
  }
): Response<Success>;
