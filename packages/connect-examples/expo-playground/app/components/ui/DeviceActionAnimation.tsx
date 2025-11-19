import React from 'react';
import Lottie from 'lottie-react';
import { CheckCircle, XCircle } from 'lucide-react';
import confirmOnClassic from '../../assets/animation/confirm-on-classic.json';
import confirmOnMini from '../../assets/animation/confirm-on-mini.json';
import confirmOnProLight from '../../assets/animation/confirm-on-pro-light.json';
import confirmOnProDark from '../../assets/animation/confirm-on-pro-dark.json';
import confirmOnTouch from '../../assets/animation/confirm-on-touch.json';
import enterPassphraseOnClassic from '../../assets/animation/enter-passphrase-on-classic.json';
import enterPassphraseOnMini from '../../assets/animation/enter-passphrase-on-mini.json';
import enterPassphraseOnProLight from '../../assets/animation/enter-passphrase-on-pro-light.json';
import enterPassphraseOnProDark from '../../assets/animation/enter-passphrase-on-pro-dark.json';
import enterPassphraseOnTouch from '../../assets/animation/enter-passphrase-on-touch.json';
import enterPinOnClassic from '../../assets/animation/enter-pin-on-classic.json';
import enterPinOnMini from '../../assets/animation/enter-pin-on-mini.json';
import enterPinOnProLight from '../../assets/animation/enter-pin-on-pro-light.json';
import enterPinOnProDark from '../../assets/animation/enter-pin-on-pro-dark.json';
import enterPinOnTouch from '../../assets/animation/enter-pin-on-touch.json';
import { UI_REQUEST, UiEvent } from '@ukeyfe/hd-core';

// 动效类型
export type AnimationType = UiEvent['type'] | 'success' | 'error';

// 设备型号
export type DeviceModel = 'classic' | 'mini' | 'pro' | 'touch';

// 主题类型（适用于Pro系列）
export type ThemeType = 'light' | 'dark';

// Lottie动画数据类型
type LottieAnimationData = Record<string, unknown>;

interface DeviceActionAnimationProps {
  action: AnimationType;
  deviceModel: DeviceModel;
  theme?: ThemeType; // 仅Pro系列需要
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  onComplete?: () => void;
}

const DeviceActionAnimation: React.FC<DeviceActionAnimationProps> = ({
  action,
  deviceModel,
  theme = 'light',
  loop = true,
  autoplay = true,
  className = '',
  onComplete,
}) => {
  // 获取对应的动画数据
  const getAnimationData = (): LottieAnimationData | null => {
    // 处理自定义状态
    if (action === 'success' || action === 'error') {
      return null; // 这些状态使用自定义组件而不是Lottie动画
    }

    switch (action) {
      case UI_REQUEST.REQUEST_BUTTON:
        switch (deviceModel) {
          case 'classic':
            return confirmOnClassic;
          case 'mini':
            return confirmOnMini;
          case 'pro':
            return theme === 'light' ? confirmOnProLight : confirmOnProDark;
          case 'touch':
            return confirmOnTouch;
        }
        break;

      case UI_REQUEST.REQUEST_PASSPHRASE:
      case UI_REQUEST.REQUEST_PASSPHRASE_ON_DEVICE:
        switch (deviceModel) {
          case 'classic':
            return enterPassphraseOnClassic;
          case 'mini':
            return enterPassphraseOnMini;
          case 'pro':
            return theme === 'light' ? enterPassphraseOnProLight : enterPassphraseOnProDark;
          case 'touch':
            return enterPassphraseOnTouch;
        }
        break;

      case UI_REQUEST.REQUEST_PIN:
      case UI_REQUEST.REQUEST_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE:
        switch (deviceModel) {
          case 'classic':
            return enterPinOnClassic;
          case 'mini':
            return enterPinOnMini;
          case 'pro':
            return theme === 'light' ? enterPinOnProLight : enterPinOnProDark;
          case 'touch':
            return enterPinOnTouch;
        }
        break;
    }
    return null;
  };

  // 获取动效描述文本
  const getActionDescription = () => {
    switch (action) {
      case 'success':
        return '执行成功！';
      case 'error':
        return '执行失败';
      case UI_REQUEST.REQUEST_BUTTON:
        return '请在设备上确认操作';
      case UI_REQUEST.REQUEST_PASSPHRASE:
        return '请在设备上输入密语';
      case UI_REQUEST.REQUEST_PIN:
        return '请在设备上输入PIN码';
      case UI_REQUEST.FIRMWARE_PROCESSING:
        return '固件更新中...';
      default:
        return '正在处理...';
    }
  };

  // 获取设备名称
  const getDeviceName = () => {
    switch (deviceModel) {
      case 'classic':
        return 'OneKey Classic';
      case 'mini':
        return 'OneKey Mini';
      case 'pro':
        return 'OneKey Pro';
      case 'touch':
        return 'OneKey Touch';
      default:
        return 'OneKey Device';
    }
  };

  if (!getAnimationData()) {
    // 自定义状态的特殊处理
    if (action === 'success') {
      return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
          <div className="w-16 h-16 flex items-center justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-blue-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-blue-600">{getActionDescription()}</p>
          </div>
        </div>
      );
    }

    if (action === 'error') {
      return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
          <div className="w-16 h-16 flex items-center justify-center mb-4">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-red-600">{getActionDescription()}</p>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <div className="w-24 h-24 bg-muted/30 rounded-xl flex items-center justify-center mb-4 border border-border/20">
          <div className="text-muted-foreground text-2xl">
            {action === UI_REQUEST.REQUEST_BUTTON && '✨'}
            {action === UI_REQUEST.REQUEST_PASSPHRASE && '🔐'}
            {action === UI_REQUEST.REQUEST_PIN && '🎯'}
            {action === UI_REQUEST.FIRMWARE_PROCESSING && <div className="animate-spin">⚙️</div>}
            {!action ||
              (action !== UI_REQUEST.REQUEST_BUTTON &&
                action !== UI_REQUEST.REQUEST_PASSPHRASE &&
                action !== UI_REQUEST.REQUEST_PIN &&
                action !== UI_REQUEST.FIRMWARE_PROCESSING && (
                  <div className="flex space-x-1">
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    ></div>
                  </div>
                ))}
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground mb-1">{getDeviceName()}</p>
          <p className="text-xs text-muted-foreground">{getActionDescription() || '正在处理...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="w-full max-w-sm aspect-video overflow-hidden rounded-lg">
        <Lottie
          animationData={getAnimationData()}
          loop={loop}
          autoplay={autoplay}
          onComplete={onComplete}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </div>
      <div className="text-center mt-4">
        <p className="text-sm font-medium text-foreground mb-1">{getDeviceName()}</p>
        <p className="text-xs text-muted-foreground">{getActionDescription()}</p>
      </div>
    </div>
  );
};

export default DeviceActionAnimation;
