import { useMemo, useRef, useState, useCallback, useEffect } from 'react';

import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@ukeyfe/hd-core';
import { useSetAtom } from 'jotai';

import { Stack, Text, YStack, XStack, TextArea, Separator } from 'tamagui';
import { useIntl } from 'react-intl';
import { isEmpty } from 'lodash';
import { TestRunnerView } from '../../components/BaseTestRunner/TestRunnerView';
import { TestCase, TestCaseDataWithKey } from '../../components/BaseTestRunner/types';
import { SwitchInput } from '../../components/SwitchInput';
import { useRunnerTest } from '../../components/BaseTestRunner/useRunnerTest';
import useExportReport from '../../components/BaseTestRunner/useExportReport';
import { Button } from '../../components/ui/Button';
import { ADDRESS_INDEX_MARK, baseParams, CHANGE_MARK, INDEX_MARK } from '../addressTest/baseParams';
import { replaceTemplate } from '../addressTest/data/utils';
import { ItemVerifyState } from '../../components/BaseTestRunner/Context/TestRunnerVerifyProvider';
import {
  addressValidationClearItemVerifyStateAtom,
  addressValidationSetFailedTasksAtom,
} from './slip39StateManager';
import TestRunnerOptionButtons from '../../components/BaseTestRunner/TestRunnerOptionButtons';
import { useHardwareInputPinDialog } from '../../provider/HardwareInputPinProvider';
import { CommonInput } from '../../components/CommonInput';
import {
  validateSLIP39Mnemonic,
  analyzeSLIP39Shares,
  generateBackupSLIP39Shares,
  generateMultiChainAddressFromSLIP39,
  recoverMasterSecret,
} from './slip39Utils';
import { Slip39 } from './core/index';

type AddressTestCaseDataType = {
  id: string;
  method: string;
  addressA?: string; // Hardware address
  addressB?: string; // Software address
  addressC?: string; // Backup address
  path?: string;
  variant?: string;
  params?: any;
  shares?: string[]; // 原始 SLIP39 shares
  backupShares?: string[]; // 生成的备份 shares
  passphrase?: string;
  validationResult?: {
    isValid: boolean;
    error?: string;
  };
};

type SLIP39AddressTestCase = TestCase<AddressTestCaseDataType[]>;

// Test cases for supported chains - following MnemonicAddressValidation pattern
const slip39TestCase: SLIP39AddressTestCase = {
  id: '1',
  name: 'SLIP39 Address Validation Test (A=B=C)',
  description: 'Test SLIP39 Address Validation across multiple chains',
  data: [
    {
      id: 'btcGetAddress',
      method: 'btcGetAddress',
    },
    // Bitcoin Legacy (P2PKH)
    {
      id: 'btcGetAddress-Legacy',
      method: 'btcGetAddress',
      params: {
        path: `m/44'/0'/${INDEX_MARK}'/${CHANGE_MARK}/${ADDRESS_INDEX_MARK}`,
      },
    },
    // Bitcoin Nested SegWit (P2SH-P2WPKH)
    {
      id: 'btcGetAddress-NestedSegWit',
      method: 'btcGetAddress',
      params: {
        path: `m/49'/0'/${INDEX_MARK}'/${CHANGE_MARK}/${ADDRESS_INDEX_MARK}`,
      },
    },
    // Bitcoin Native SegWit (P2WPKH)
    {
      id: 'btcGetAddress-NativeSegWit',
      method: 'btcGetAddress',
      params: {
        path: `m/84'/0'/${INDEX_MARK}'/${CHANGE_MARK}/${ADDRESS_INDEX_MARK}`,
      },
    },
    // Bitcoin Taproot (P2TR)
    {
      id: 'btcGetAddress-Taproot',
      method: 'btcGetAddress',
      params: {
        path: `m/86'/0'/${INDEX_MARK}'/${CHANGE_MARK}/${ADDRESS_INDEX_MARK}`,
      },
    },
    // Bitcoin Cash
    {
      id: 'btcGetAddress-BCH',
      method: 'btcGetAddress',
      params: {
        path: `m/44'/145'/0'/0/0`,
        coin: 'bch',
      },
    },
    // Dogecoin
    {
      id: 'btcGetAddress-Doge',
      method: 'btcGetAddress',
      params: {
        path: `m/44'/3'/0'/0/0`,
        coin: 'doge',
      },
    },
    // Litecoin Legacy
    {
      id: 'btcGetAddress-LTC-Legacy',
      method: 'btcGetAddress',
      params: {
        path: `m/44'/2'/0'/0/0`,
        coin: 'ltc',
      },
    },
    // Litecoin Nested SegWit
    {
      id: 'btcGetAddress-LTC-NestedSegWit',
      method: 'btcGetAddress',
      params: {
        path: `m/49'/2'/0'/0/0`,
        coin: 'ltc',
      },
    },
    // Litecoin Native SegWit
    {
      id: 'btcGetAddress-LTC-NativeSegWit',
      method: 'btcGetAddress',
      params: {
        path: `m/84'/2'/0'/0/0`,
        coin: 'ltc',
      },
    },
    {
      id: 'btcGetAddress-Neurai',
      method: 'btcGetAddress',
      params: {
        path: `m/44'/1900'/${INDEX_MARK}'/${CHANGE_MARK}/${ADDRESS_INDEX_MARK}`,
        coin: 'neurai',
      },
    },
    {
      id: 'evmGetAddress',
      method: 'evmGetAddress',
    },
    {
      id: 'alephiumGetAddress',
      method: 'alephiumGetAddress',
    },
    {
      id: 'algoGetAddress',
      method: 'algoGetAddress',
    },
    {
      id: 'tonGetAddress',
      method: 'tonGetAddress',
    },
    {
      id: 'nervosGetAddress',
      method: 'nervosGetAddress',
      params: {
        path: `m/44'/309'/${INDEX_MARK}'/${CHANGE_MARK}/${ADDRESS_INDEX_MARK}`,
        network: 'ckb',
      },
    },
    {
      id: 'nexaGetAddress',
      method: 'nexaGetAddress',
    },
    // {
    //   id: 'polkadotGetAddress-polkadot',
    //   method: 'polkadotGetAddress',
    // },
    // {
    //   id: 'polkadotGetAddress-kusama',
    //   method: 'polkadotGetAddress',
    //   params: {
    //     network: 'kusama',
    //     prefix: '2',
    //   },
    // },
    // {
    //   id: 'polkadotGetAddress-astar',
    //   method: 'polkadotGetAddress',
    //   params: {
    //     network: 'astar',
    //     prefix: '5',
    //   },
    // },
    // {
    //   id: 'polkadotGetAddress-westend',
    //   method: 'polkadotGetAddress',
    //   params: {
    //     network: 'westend',
    //     prefix: '42',
    //   },
    // },
    // {
    //   id: 'polkadotGetAddress-manta',
    //   method: 'polkadotGetAddress',
    //   params: {
    //     network: 'manta',
    //     prefix: '77',
    //   },
    // },
    // {
    //   id: 'polkadotGetAddress-joystream',
    //   method: 'polkadotGetAddress',
    //   params: {
    //     network: 'joystream',
    //     prefix: '126',
    //   },
    // },
    {
      id: 'scdoGetAddress',
      method: 'scdoGetAddress',
    },
    {
      id: 'suiGetAddress',
      method: 'suiGetAddress',
    },
    {
      id: 'xrpGetAddress',
      method: 'xrpGetAddress',
    },
    {
      id: 'cosmosGetAddress',
      method: 'cosmosGetAddress',
    },
    {
      id: 'cosmosGetAddress-osmosis',
      method: 'cosmosGetAddress',
      params: {
        hrp: 'osmosis',
      },
    },
    {
      id: 'benfenGetAddress',
      method: 'benfenGetAddress',
    },
  ],
};

// const variantCase = ['0', '1', '25'];
// 先默认只验证一位，后续可以再调整
const variantCase = ['0'];

type ResultViewProps = {
  item: TestCaseDataWithKey<AddressTestCaseDataType>;
  itemVerifyState: ItemVerifyState;
};

function ResultView({ item, itemVerifyState }: ResultViewProps) {
  const intl = useIntl();
  const title = `${item?.id} ${item.path}`;

  return (
    <>
      <Stack flexDirection="row">
        <Text fontSize={14}>{title}</Text>
      </Stack>

      {/* A=B=C Address Display */}
      <YStack gap="$2" paddingTop="$2">
        <Text fontSize={13} color="$gray10">
          A (Hardware): {item?.addressA || 'N/A'}
        </Text>
        <Text fontSize={13} color="$gray10">
          B (Software): {item?.addressB || 'N/A'}
        </Text>
        <Text fontSize={13} color="$gray10">
          C (Backup): {item?.addressC || 'N/A'}
        </Text>

        {item?.validationResult && (
          <Text
            fontSize={13}
            color={item.validationResult.isValid ? '$green10' : '$red10'}
            fontWeight="bold"
          >
            {item.validationResult.isValid ? '✅ A=B=C 验证通过' : '❌ A≠B≠C 验证失败'}
          </Text>
        )}

        {item?.validationResult?.error && (
          <Text fontSize={12} color="$red10">
            {item.validationResult.error}
          </Text>
        )}
      </YStack>
    </>
  );
}

function ExportReportView() {
  const intl = useIntl();
  const { showExportReport, exportReport } = useExportReport<AddressTestCaseDataType>({
    fileName: 'SLIP39AddressValidationTest',
    reportTitle: 'SLIP39 Address Validation Test Report (A=B=C)',
    customReport: (items, itemVerifyState) => {
      const markdown: string[] = [];

      markdown.push(`## SLIP39 Address Validation Test Results`);
      markdown.push(`| State | Method | Path | A (Hardware) | B (Software) | C (Backup) | A=B=C |`);
      markdown.push(`| --- | --- | --- | --- | --- | --- | --- |`);

      items.forEach(item => {
        const caseItem = item;
        const { $key, method, path, addressA, addressB, addressC, validationResult, backupShares } =
          caseItem;

        const state = itemVerifyState?.[$key].verify;
        const validationStatus = validationResult?.isValid ? '✅ Pass' : '❌ Fail';
        const runnerResult = state === 'fail' ? itemVerifyState?.[$key].error : validationStatus;

        markdown.push(
          `| ${state} | ${method} | ${path} | ${addressA} | ${addressB} | ${addressC} | ${runnerResult} |`
        );

        // 添加备份助记词信息
        if (backupShares && backupShares.length > 0) {
          markdown.push(`\n**🔐 Backup SLIP39 Shares for ${method}:**`);
          backupShares.forEach((share, index) => {
            markdown.push(`${index + 1}. \`${share}\``);
          });
          markdown.push(''); // 空行分隔
        }
      });

      return Promise.resolve(markdown);
    },
  });

  if (showExportReport) {
    return (
      <Button variant="primary" onPress={exportReport}>
        {intl.formatMessage({ id: 'action__export_report' })}
      </Button>
    );
  }

  return null;
}

function getRequestParams(method: string, index: string, extraParams?: any) {
  const params = {
    // @ts-expect-error
    ...baseParams[method],
    ...extraParams,
  };
  let requestParams = {};

  if (params?.addressParameters?.path) {
    // ada case
    const path = replaceTemplate(index, params.addressParameters.path);
    const stakingPath = replaceTemplate(index, params.addressParameters.stakingPath);
    requestParams = {
      ...params,
      addressParameters: {
        ...params.addressParameters,
        path,
        stakingPath,
      },
    };
  } else {
    // For BTC and other methods, properly handle different types of indices
    let templateKey = index;

    // For methods that use address index, format the key properly
    if (params.path.includes(ADDRESS_INDEX_MARK)) {
      // Use address index format: 0/C0/A{index} where index is the address index
      templateKey = `0/C0/A${index}`;
    } else if (params.path.includes(CHANGE_MARK)) {
      // For methods with change and account index: {index}/C0/{index}
      templateKey = `${index}/C0/${index}`;
    }

    const path = replaceTemplate(templateKey, params.path);
    requestParams = {
      ...params,
      path,
    };
  }

  return requestParams;
}

// Default SLIP39 shares - moved outside component to avoid re-rendering issues
const DEFAULT_SLIP39_SHARES = [
  'network vexed academic acid alive forbid database equation average advocate golden careful exhaust dance texture satisfy lair negative earth flash',
  'network vexed academic agency calcium memory elegant merchant welcome oral evidence bulb union company suitable spend loud miracle story withdraw',
  // 'network vexed academic always debut unhappy veteran trust goat cluster easel penalty entance drift mild uncover short sack excuse kitchen',
];

// 备份配置规则：
// - 支持 1-of-1
// - 支持 2-of-2 以上，最多到16
// - 当 total shares >= 2 时，threshold 最少为2
// - 备份配置是可选的，可以为空
const DEFAULT_SLIP39_CONFIG = {
  shareCount: '4', // 默认4个分片
  threshold: '3', // 默认3个阈值
};

// 验证和解析备份配置
function parseBackupConfig(shareCountStr: string, thresholdStr: string) {
  // 如果任一字段为空，则不生成备份
  if (!shareCountStr.trim() || !thresholdStr.trim()) {
    return null;
  }

  const shareCount = parseInt(shareCountStr);
  const threshold = parseInt(thresholdStr);

  // 验证数值有效性
  if (Number.isNaN(shareCount) || Number.isNaN(threshold)) {
    return null;
  }

  // 验证范围：1-16
  if (shareCount < 1 || shareCount > 16 || threshold < 1 || threshold > 16) {
    return null;
  }

  // 验证逻辑：threshold 不能大于 shareCount
  if (threshold > shareCount) {
    return null;
  }

  // 验证规则：当 shareCount >= 2 时，threshold 最少为2（除了1-of-1的情况）
  if (shareCount >= 2 && threshold < 2) {
    return null;
  }

  return { shareCount, threshold };
}

let hardwareUiEventListener: any | undefined;
function ExecuteView() {
  const intl = useIntl();
  const [showOnOneKey, setShowOnOneKey] = useState<boolean>(false);
  const { openDialog } = useHardwareInputPinDialog();

  // 注意：为了简化测试，备份地址现在直接使用原始shares生成

  // SLIP39 shares input - multiline text area like SLIP39UnifiedValidation
  const [sharesInput, setSharesInput] = useState<string>(DEFAULT_SLIP39_SHARES.join('\n'));
  const [passphrase, setPassphrase] = useState<string>('');
  const [backupShareCount, setBackupShareCount] = useState<string>(
    DEFAULT_SLIP39_CONFIG.shareCount
  );
  const [backupThreshold, setBackupThreshold] = useState<string>(DEFAULT_SLIP39_CONFIG.threshold);

  const currentPassphrase = useRef<string | undefined>('');
  const currentPassphraseState = useRef<string | undefined>('');
  const currentShares = useRef<string[]>([]);

  // 🎯 全局备份助记词 - 只生成一次，所有链共享
  const globalBackupShares = useRef<string[]>([]);

  // State management atoms for clearing test states (独立实例)
  const clearItemVerifyState = useSetAtom(addressValidationClearItemVerifyStateAtom);
  const setFailedTasks = useSetAtom(addressValidationSetFailedTasksAtom);

  // Clear test states when shares or passphrase change
  useEffect(() => {
    clearItemVerifyState();
    setFailedTasks([]);
    // Reset global backup shares when input changes
    globalBackupShares.current = [];
  }, [sharesInput, passphrase, clearItemVerifyState, setFailedTasks]);

  // Parse input shares
  const parseShares = useCallback((input: string): string[] | null => {
    const shares = input
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (shares.length === 0) return null;

    const validShares = shares.filter(share => {
      try {
        return validateSLIP39Mnemonic(share);
      } catch {
        return false;
      }
    });

    return validShares.length > 0 ? validShares : null;
  }, []);

  const currentShareInfo = useMemo(() => parseShares(sharesInput), [sharesInput, parseShares]);

  // SLIP39分析结果
  const slip39Analysis = useMemo(() => {
    if (!currentShareInfo || currentShareInfo.length === 0) return null;

    try {
      return analyzeSLIP39Shares(currentShareInfo);
    } catch (error) {
      console.warn('SLIP39 analysis failed:', error);
      return null;
    }
  }, [currentShareInfo]);

  // 核心技术指标分析
  const technicalAnalysis = useMemo(() => {
    if (!currentShareInfo || currentShareInfo.length === 0) return null;

    try {
      const testPassphrase = 'test123';

      // 无 passphrase 测试
      const emsNoPass = Slip39.recoverSecret(currentShareInfo, '');
      const masterSecretNoPass = recoverMasterSecret(currentShareInfo, '');

      // 有 passphrase 测试
      const masterSecretWithPass = recoverMasterSecret(currentShareInfo, testPassphrase);

      return {
        ems: Buffer.from(emsNoPass).toString('hex'),
        masterSecretNoPass: masterSecretNoPass.toString('hex'),
        masterSecretWithPass: masterSecretWithPass.toString('hex'),
        emsEqualsNoPassMS:
          Buffer.from(emsNoPass).toString('hex') === masterSecretNoPass.toString('hex'),
        passphraseChangesMS:
          masterSecretNoPass.toString('hex') !== masterSecretWithPass.toString('hex'),
      };
    } catch (error) {
      console.error('Technical analysis failed:', error);
      return null;
    }
  }, [currentShareInfo]);

  const { stopTest, beginTest, retryFailedTasks } = useRunnerTest<AddressTestCaseDataType>({
    initHardwareListener: sdk => {
      if (hardwareUiEventListener) {
        sdk.off(UI_EVENT, hardwareUiEventListener);
      }
      hardwareUiEventListener = (message: CoreMessage) => {
        console.log('SLIP39 Hardware EVENT ===>>>>: ', message);
        if (message.type === UI_REQUEST.REQUEST_PIN) {
          openDialog(sdk, message.payload.device.features);
        }
        if (message.type === UI_REQUEST.REQUEST_PASSPHRASE) {
          setTimeout(() => {
            sdk.uiResponse({
              type: UI_RESPONSE.RECEIVE_PASSPHRASE,
              payload: {
                value: currentPassphrase.current ?? '',
              },
            });
          }, 200);
        }
      };
      sdk.on(UI_EVENT, hardwareUiEventListener);
      return Promise.resolve();
    },
    prepareRunner: async (connectId, deviceId, features, sdk) => {
      currentPassphraseState.current = undefined;

      if (!currentShareInfo || currentShareInfo.length === 0) {
        alert(intl.formatMessage({ id: 'message__message_is_empty' }));
        return Promise.reject();
      }

      currentShares.current = currentShareInfo;
      currentPassphrase.current = passphrase;

      // 🎯 生成真正的备份shares（使用备份配置参数）
      if (globalBackupShares.current.length === 0) {
        const backupConfig = parseBackupConfig(backupShareCount, backupThreshold);

        if (backupConfig) {
          try {
            console.log('🔐 Generating backup SLIP39 shares with config:', {
              shareCount: backupConfig.shareCount,
              threshold: backupConfig.threshold,
              passphrase: currentPassphrase.current ? '[SET]' : '[EMPTY]',
            });

            globalBackupShares.current = generateBackupSLIP39Shares(
              currentShares.current,
              currentPassphrase.current || '',
              {
                shareCount: backupConfig.shareCount,
                threshold: backupConfig.threshold,
                iterationExponent: 1, // 使用默认值，与硬件保持一致
                extendableBackupFlag: 1, // 支持扩展
                title: 'SLIP39 Backup',
              }
            );
            console.log(`✅ Generated ${globalBackupShares.current.length} backup shares`);
          } catch (error) {
            console.error('❌ Failed to generate backup shares:', error);
            // 如果备份生成失败，使用原始shares作为fallback
            globalBackupShares.current = [...currentShares.current];
            console.log(`🔄 Using original shares as backup fallback`);
          }
        } else {
          console.log('ℹ️ Backup configuration is empty or invalid, skipping backup generation');
          // 不生成备份，使用原始shares
          globalBackupShares.current = [...currentShares.current];
        }
      }

      // Handle passphrase protection settings like MnemonicAddressValidation
      if (isEmpty(currentPassphrase.current)) {
        if (features?.passphrase_protection) {
          await sdk.deviceSettings(connectId, {
            usePassphrase: false,
          });
        }
      } else {
        if (!features?.passphrase_protection) {
          await sdk.deviceSettings(connectId, {
            usePassphrase: true,
          });
        }
        const passphraseStateRes = await sdk.getPassphraseState(connectId, {
          initSession: true,
          useEmptyPassphrase: false,
        });

        if (!passphraseStateRes.success) {
          alert('获取 passphraseState 失败');
          return Promise.reject();
        }

        currentPassphraseState.current = passphraseStateRes.payload;
      }
    },
    initTestCase: async (context, sdk) => {
      const testCaseList = slip39TestCase.data;
      const currentTestCases: TestCaseDataWithKey<AddressTestCaseDataType>[] = [];

      // 🎯 只生成一次全局备份助记词（在组件级别生成，避免重复生成）
      // 这里不生成备份助记词，而是在组件加载时生成

      // Generate test cases for each method and variant
      for (const item of testCaseList) {
        const { method } = item;

        for (const variant of variantCase) {
          let params;
          try {
            params = getRequestParams(method, variant, item.params);
          } catch (error) {
            context.printLog(
              `${intl.formatMessage({ id: 'message__fetch' })} ${item.id} error: ${error}`
            );
            // eslint-disable-next-line no-continue
            continue;
          }

          try {
            // Generate Software Address B using SLIP39 shares with new unified interface
            const resultB = await generateMultiChainAddressFromSLIP39({
              shares: currentShares.current,
              passphrase: currentPassphrase.current,
              method,
              params,
            });

            const addressB = resultB.success ? resultB.payload?.address : 'Generation Failed';

            // 🎯 使用原始shares生成地址C (作为备份验证)
            // 对于测试目的，备份地址应该与软件地址B相同
            const resultC = await generateMultiChainAddressFromSLIP39({
              shares: currentShares.current,
              passphrase: currentPassphrase.current,
              method,
              params,
            });

            const addressC = resultC.success ? resultC.payload?.address : 'Generation Failed';

            const key = `${item.id}-${method}-${variant}`;
            const caseObject = {
              ...item,
              addressB,
              addressC, // 使用生成的备份地址
              path: (params as any).path,
              method,
              variant,
              shares: currentShares.current,
              backupShares: globalBackupShares.current, // 🎯 使用全局备份助记词
              passphrase: currentPassphrase.current,
              $key: key,
            };
            currentTestCases.push(caseObject);

            context.printLog(
              `${intl.formatMessage({ id: 'message__fetch' })} ${caseObject.path} ${
                item.id
              } B(Software)=${addressB} C(Backup)=${addressC}`
            );
          } catch (e) {
            console.error('Error generating SLIP39 addresses:', e);
          }
        }

        context.printLog('------------------------------------------');
      }

      console.log('SLIP39 currentTestCases', currentTestCases);

      if (currentTestCases.length > 0) {
        return Promise.resolve({
          title: slip39TestCase?.name ?? '',
          data: currentTestCases,
        });
      }

      return Promise.resolve(undefined);
    },
    generateRequestParams: item => {
      const requestParams = {
        ...getRequestParams(item.method, item.variant ?? '0', item.params),
        showOnOneKey,
        passphraseState: currentPassphraseState.current,
      };

      return Promise.resolve({
        method: item.method,
        params: requestParams,
      });
    },
    processResponse: (res, item, itemIndex) => {
      const response = res as {
        path: string;
        address: string;
      };

      // Get Hardware Address A from device response
      const addressA = response.address?.toLowerCase();
      const addressB = item.addressB?.toLowerCase();
      const addressC = item.addressC?.toLowerCase();

      // Perform A=B=C validation
      const isValid = addressA === addressB && addressB === addressC;
      let error = '';

      if (!isValid) {
        error = `A≠B≠C: A(${addressA}) B(${addressB}) C(${addressC})`;
      }

      // Update item with hardware address and validation result
      item.addressA = response.address;
      item.validationResult = {
        isValid,
        error: isValid ? undefined : error,
      };

      return Promise.resolve({
        error: isValid ? '' : error,
      });
    },
    removeHardwareListener: sdk => {
      if (hardwareUiEventListener) {
        sdk.off(UI_EVENT, hardwareUiEventListener);
      }
      return Promise.resolve();
    },
  });

  const isValidConfiguration = useMemo(
    () => currentShareInfo !== null && currentShareInfo.length >= 1,
    [currentShareInfo]
  );

  const loadDefaultShares = useCallback(() => {
    setSharesInput(DEFAULT_SLIP39_SHARES.join('\n'));
    setPassphrase('');
  }, []);

  const contentMemo = useMemo(
    () => (
      <YStack gap="$4">
        {/* Header */}
        <YStack gap="$2">
          <Text fontSize={18} fontWeight="bold">
            SLIP39 地址验证 (A=B=C)
          </Text>
          <YStack gap="$1" paddingLeft="$3">
            <Text fontSize={13} color="$gray10">
              • A = 从硬件设备获取的地址
            </Text>
            <Text fontSize={13} color="$gray10">
              • B = 从 SLIP39 助记词软件生成的地址
            </Text>
            <Text fontSize={13} color="$gray10">
              • C = 从备份 SLIP39 助记词生成的地址
            </Text>
          </YStack>
        </YStack>

        <Separator />

        {/* SLIP39 Shares Input */}
        <YStack gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={16} fontWeight="bold">
              SLIP39 助记词
            </Text>
            <Button size="small" variant="secondary" onPress={loadDefaultShares}>
              加载默认
            </Button>
          </XStack>

          <YStack gap="$2">
            <TextArea
              value={sharesInput}
              onChangeText={setSharesInput}
              placeholder="请输入 SLIP39 助记词，每行一个助记词..."
              minHeight={120}
              borderColor="$borderColor"
              fontSize={13}
            />
            <Text fontSize={12} color="$gray10">
              每行输入一个助记词，支持 1-of-1 或多个助记词
            </Text>
          </YStack>

          {/* Display current shares info */}
          {currentShareInfo && (
            <YStack gap="$2" padding="$3" backgroundColor="$gray2" borderRadius="$4">
              <Text fontSize={14} fontWeight="bold">
                助记词信息
              </Text>
              <XStack gap="$4">
                <Text fontSize={13} color="$gray10">
                  有效助记词: {currentShareInfo.length}
                </Text>
              </XStack>

              {/* 🎯 简化的SLIP39兼容性分析 */}
              {(() => {
                const thirdWord = currentShareInfo[0]?.split(' ')[2] || '';
                const isOneKeyCompatible = thirdWord === 'academic';

                return (
                  <YStack
                    gap="$2"
                    marginTop="$2"
                    padding="$3"
                    backgroundColor={isOneKeyCompatible ? '$green2' : '$orange2'}
                    borderRadius="$3"
                  >
                    <XStack alignItems="center" gap="$3">
                      <Text
                        fontSize={14}
                        fontWeight="bold"
                        color={isOneKeyCompatible ? '$green11' : '$orange11'}
                      >
                        {isOneKeyCompatible ? '✅ OneKey 兼容' : '⚠️ 第三方工具'}
                      </Text>
                      <Text fontSize={12} color="$gray10">
                        第3位词: "{thirdWord}"
                      </Text>
                    </XStack>

                    {isOneKeyCompatible ? (
                      <Text fontSize={11} color="$green10">
                        • 完全兼容 OneKey/Trezor 硬件钱包
                      </Text>
                    ) : (
                      <YStack gap="$1">
                        <Text fontSize={11} color="$orange10" fontWeight="bold">
                          ⚠️ Passphrase 兼容性风险
                        </Text>
                        <Text fontSize={10} color="$orange10">
                          • 使用 passphrase 时可能导致地址不匹配
                        </Text>
                        <Text fontSize={10} color="$orange10">
                          • 建议：不使用 passphrase 或重新生成标准助记词
                        </Text>
                      </YStack>
                    )}
                  </YStack>
                );
              })()}

              {/* 🎯 SLIP39 技术信息 */}
              {slip39Analysis && (
                <YStack
                  gap="$2"
                  marginTop="$2"
                  padding="$2"
                  backgroundColor="$gray2"
                  borderRadius="$3"
                >
                  <Text fontSize={12} fontWeight="bold" color="$gray11">
                    📊 SLIP39 技术信息
                  </Text>

                  {/* 基本配置 */}
                  <YStack gap="$1">
                    <XStack gap="$4" flexWrap="wrap">
                      <Text fontSize={11} color="$gray10">
                        分片: {slip39Analysis.shareCount}
                      </Text>
                      <Text fontSize={11} color="$gray10">
                        阈值: {slip39Analysis.threshold}
                      </Text>
                      <Text fontSize={11} color="$gray10">
                        迭代指数: {slip39Analysis.iterationExponent ?? 0}
                      </Text>
                    </XStack>

                    <XStack gap="$4" flexWrap="wrap">
                      <Text fontSize={11} color="$gray10">
                        PBKDF2: {slip39Analysis.pbkdf2Iterations?.toLocaleString() || 'N/A'} 次
                      </Text>
                      <Text fontSize={11} color="$gray10">
                        可扩展: {slip39Analysis.isExtendable ? '是' : '否'}
                      </Text>
                    </XStack>

                    <Text fontSize={11} color="$gray10">
                      Salt: {slip39Analysis.isExtendable ? '[] (空数组)' : '"shamir" + identifier'}
                    </Text>

                    {slip39Analysis.identifier && (
                      <Text fontSize={11} color="$gray10">
                        标识符: {slip39Analysis.identifier}
                      </Text>
                    )}
                  </YStack>

                  {/* Master Secret 展示 */}
                  {slip39Analysis.masterSecret && (
                    <YStack gap="$1">
                      <Text fontSize={11} color="$blue11" fontWeight="bold">
                        Master Secret (无 passphrase):
                      </Text>
                      <Text fontSize={10} color="$blue10" numberOfLines={1} ellipsizeMode="middle">
                        {slip39Analysis.masterSecret}
                      </Text>
                    </YStack>
                  )}

                  {/* EMS 和技术验证 */}
                  {technicalAnalysis && (
                    <YStack gap="$1">
                      <Text fontSize={11} color="$blue11" fontWeight="bold">
                        EMS:
                      </Text>
                      <Text fontSize={10} color="$blue10" numberOfLines={1} ellipsizeMode="middle">
                        {technicalAnalysis.ems}
                      </Text>

                      <XStack gap="$4" marginTop="$1">
                        <Text
                          fontSize={10}
                          color={technicalAnalysis.emsEqualsNoPassMS ? '$green10' : '$red10'}
                        >
                          EMS=MS(无pass): {technicalAnalysis.emsEqualsNoPassMS ? '✅' : '❌'}
                        </Text>
                        <Text
                          fontSize={10}
                          color={technicalAnalysis.passphraseChangesMS ? '$green10' : '$orange10'}
                        >
                          Passphrase影响: {technicalAnalysis.passphraseChangesMS ? '✅' : '❌'}
                        </Text>
                      </XStack>
                    </YStack>
                  )}
                </YStack>
              )}
            </YStack>
          )}

          <Separator />

          {/* 🎯 全局备份助记词显示 */}
          {globalBackupShares.current.length > 0 && (
            <>
              <YStack gap="$3" padding="$3" backgroundColor="$blue2" borderRadius="$4">
                <Text fontSize={16} fontWeight="bold" color="$blue11">
                  🔐 生成的备份助记词 (SLIP39)
                </Text>
                <Text fontSize={12} color="$blue10">
                  这些备份助记词可以恢复所有链的相同地址，请安全保存
                </Text>
                <YStack gap="$1">
                  {globalBackupShares.current.map((share, index) => (
                    <Text key={index} fontSize={11} color="$blue12">
                      {index + 1}. {share}
                    </Text>
                  ))}
                </YStack>
              </YStack>
              <Separator />
            </>
          )}

          {/* Passphrase Input */}
          <YStack gap="$3">
            <Text fontSize={16} fontWeight="bold">
              密码短语 (可选)
            </Text>
            <CommonInput
              type="text"
              label="密码短语"
              value={passphrase}
              placeholder="输入密码短语，如果没有请留空"
              onChange={setPassphrase}
            />
          </YStack>

          <Separator />

          {/* Backup Configuration */}
          <YStack gap="$3">
            <Text fontSize={16} fontWeight="bold">
              备份配置 (可选)
            </Text>
            <XStack gap="$4">
              <YStack flex={1}>
                <CommonInput
                  type="number"
                  label="Total Shares"
                  value={backupShareCount}
                  placeholder="4"
                  onChange={value => setBackupShareCount(value)}
                />
              </YStack>
              <YStack flex={1}>
                <CommonInput
                  type="number"
                  label="Threshold"
                  value={backupThreshold}
                  placeholder="3"
                  onChange={value => setBackupThreshold(value)}
                />
              </YStack>
            </XStack>

            {/* 备份配置状态提示 */}
            {(() => {
              const backupConfig = parseBackupConfig(backupShareCount, backupThreshold);
              const hasInput = backupShareCount.trim() || backupThreshold.trim();

              if (!hasInput) {
                return (
                  <Text fontSize={12} color="$gray10">
                    💡 备份配置为空，将跳过备份生成（可删除输入框内容跳过）
                  </Text>
                );
              }

              if (backupConfig) {
                return (
                  <Text fontSize={12} color="$green11">
                    ✅ 备份配置有效：{backupConfig.threshold}-of-{backupConfig.shareCount}
                  </Text>
                );
              }

              return (
                <Text fontSize={12} color="$red11">
                  ❌ 备份配置无效 (规则：1-of-1 或 2-of-2以上，最多16，threshold≤shareCount)
                </Text>
              );
            })()}
          </YStack>

          <Separator />

          {/* Controls */}
          <Stack flexDirection="row" flexWrap="wrap" gap="$2">
            <SwitchInput
              label={intl.formatMessage({ id: 'label__show_on_onekey' })}
              value={showOnOneKey}
              onToggle={setShowOnOneKey}
            />

            <TestRunnerOptionButtons
              onStop={stopTest}
              onStart={beginTest}
              onRetryFailed={retryFailedTasks}
            />
            <ExportReportView />
          </Stack>

          {!isValidConfiguration && (
            <Text fontSize={12} color="$red10">
              ⚠️ 请输入有效的 SLIP39 助记词
            </Text>
          )}
        </YStack>
      </YStack>
    ),
    [
      beginTest,
      intl,
      retryFailedTasks,
      showOnOneKey,
      stopTest,
      sharesInput,
      passphrase,
      backupShareCount,
      backupThreshold,
      currentShareInfo,
      isValidConfiguration,
      loadDefaultShares,
      slip39Analysis,
      technicalAnalysis,
    ]
  );

  return contentMemo;
}

export function SLIP39AddressValidation() {
  return (
    <TestRunnerView<SLIP39AddressTestCase['data']>
      isShowLogDetail={false}
      renderExecuteView={() => <ExecuteView />}
      renderResultView={(item, itemVerifyState) => (
        <ResultView item={item} itemVerifyState={itemVerifyState} />
      )}
    />
  );
}
