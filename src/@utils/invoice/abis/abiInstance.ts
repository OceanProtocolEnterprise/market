const abiInstance = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      {
        indexed: true,
        internalType: 'address',
        name: 'signer',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'blockNumber',
        type: 'uint256'
      }
    ],
    name: 'AddedMinter',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      {
        indexed: true,
        internalType: 'address',
        name: 'signer',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'blockNumber',
        type: 'uint256'
      }
    ],
    name: 'AddedPaymentManager',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'spender',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256'
      }
    ],
    name: 'Approval',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'signer',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'blockNumber',
        type: 'uint256'
      }
    ],
    name: 'CleanedPermissions',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'consumeMarketFeeAddress',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'consumeMarketFeeToken',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'consumeMarketFeeAmount',
        type: 'uint256'
      }
    ],
    name: 'ConsumeMarketFee',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'currentMinter',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'newMinter',
        type: 'address'
      }
    ],
    name: 'MinterApproved',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'currentMinter',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'newMinter',
        type: 'address'
      }
    ],
    name: 'MinterProposed',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'dispenserContract',
        type: 'address'
      }
    ],
    name: 'NewDispenser',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'exchangeId',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'exchangeContract',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'baseToken',
        type: 'address'
      }
    ],
    name: 'NewFixedRate',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'caller',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: '_newPaymentCollector',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'blockNumber',
        type: 'uint256'
      }
    ],
    name: 'NewPaymentCollector',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'providerAddress',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'consumerAddress',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'orderTxId',
        type: 'bytes32'
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'providerData',
        type: 'bytes'
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'providerSignature',
        type: 'bytes'
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'consumerData',
        type: 'bytes'
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'consumerSignature',
        type: 'bytes'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'blockNumber',
        type: 'uint256'
      }
    ],
    name: 'OrderExecuted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'orderTxId',
        type: 'bytes32'
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'caller',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'number',
        type: 'uint256'
      }
    ],
    name: 'OrderReused',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'consumer',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'payer',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'serviceIndex',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'publishMarketAddress',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'blockNumber',
        type: 'uint256'
      }
    ],
    name: 'OrderStarted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'providerFeeAddress',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'providerFeeToken',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'providerFeeAmount',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'providerData',
        type: 'bytes'
      },
      { indexed: false, internalType: 'uint8', name: 'v', type: 'uint8' },
      { indexed: false, internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { indexed: false, internalType: 'bytes32', name: 's', type: 'bytes32' },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'validUntil',
        type: 'uint256'
      }
    ],
    name: 'ProviderFee',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'PublishMarketFeeAddress',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'PublishMarketFeeToken',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'PublishMarketFeeAmount',
        type: 'uint256'
      }
    ],
    name: 'PublishMarketFee',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'caller',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'PublishMarketFeeAddress',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'PublishMarketFeeToken',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'PublishMarketFeeAmount',
        type: 'uint256'
      }
    ],
    name: 'PublishMarketFeeChanged',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      {
        indexed: true,
        internalType: 'address',
        name: 'signer',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'blockNumber',
        type: 'uint256'
      }
    ],
    name: 'RemovedMinter',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      {
        indexed: true,
        internalType: 'address',
        name: 'signer',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'blockNumber',
        type: 'uint256'
      }
    ],
    name: 'RemovedPaymentManager',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'from', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256'
      }
    ],
    name: 'Transfer',
    type: 'event'
  },
  { stateMutability: 'payable', type: 'fallback' },
  {
    inputs: [],
    name: 'BASE',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'DOMAIN_SEPARATOR',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'PERMIT_TYPEHASH',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '_minter', type: 'address' }],
    name: 'addMinter',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '_paymentManager', type: 'address' }
    ],
    name: 'addPaymentManager',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'authERC20',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'burn',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'burnFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'consumer', type: 'address' },
          { internalType: 'uint256', name: 'serviceIndex', type: 'uint256' },
          {
            components: [
              {
                internalType: 'address',
                name: 'providerFeeAddress',
                type: 'address'
              },
              {
                internalType: 'address',
                name: 'providerFeeToken',
                type: 'address'
              },
              {
                internalType: 'uint256',
                name: 'providerFeeAmount',
                type: 'uint256'
              },
              { internalType: 'uint8', name: 'v', type: 'uint8' },
              { internalType: 'bytes32', name: 'r', type: 'bytes32' },
              { internalType: 'bytes32', name: 's', type: 'bytes32' },
              { internalType: 'uint256', name: 'validUntil', type: 'uint256' },
              { internalType: 'bytes', name: 'providerData', type: 'bytes' }
            ],
            internalType: 'struct ERC20TemplateEnterprise.providerFee',
            name: '_providerFee',
            type: 'tuple'
          },
          {
            components: [
              {
                internalType: 'address',
                name: 'consumeMarketFeeAddress',
                type: 'address'
              },
              {
                internalType: 'address',
                name: 'consumeMarketFeeToken',
                type: 'address'
              },
              {
                internalType: 'uint256',
                name: 'consumeMarketFeeAmount',
                type: 'uint256'
              }
            ],
            internalType: 'struct ERC20TemplateEnterprise.consumeMarketFee',
            name: '_consumeMarketFee',
            type: 'tuple'
          }
        ],
        internalType: 'struct ERC20TemplateEnterprise.OrderParams',
        name: '_orderParams',
        type: 'tuple'
      },
      { internalType: 'address', name: 'dispenserContract', type: 'address' }
    ],
    name: 'buyFromDispenserAndOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'consumer', type: 'address' },
          { internalType: 'uint256', name: 'serviceIndex', type: 'uint256' },
          {
            components: [
              {
                internalType: 'address',
                name: 'providerFeeAddress',
                type: 'address'
              },
              {
                internalType: 'address',
                name: 'providerFeeToken',
                type: 'address'
              },
              {
                internalType: 'uint256',
                name: 'providerFeeAmount',
                type: 'uint256'
              },
              { internalType: 'uint8', name: 'v', type: 'uint8' },
              { internalType: 'bytes32', name: 'r', type: 'bytes32' },
              { internalType: 'bytes32', name: 's', type: 'bytes32' },
              { internalType: 'uint256', name: 'validUntil', type: 'uint256' },
              { internalType: 'bytes', name: 'providerData', type: 'bytes' }
            ],
            internalType: 'struct ERC20TemplateEnterprise.providerFee',
            name: '_providerFee',
            type: 'tuple'
          },
          {
            components: [
              {
                internalType: 'address',
                name: 'consumeMarketFeeAddress',
                type: 'address'
              },
              {
                internalType: 'address',
                name: 'consumeMarketFeeToken',
                type: 'address'
              },
              {
                internalType: 'uint256',
                name: 'consumeMarketFeeAmount',
                type: 'uint256'
              }
            ],
            internalType: 'struct ERC20TemplateEnterprise.consumeMarketFee',
            name: '_consumeMarketFee',
            type: 'tuple'
          }
        ],
        internalType: 'struct ERC20TemplateEnterprise.OrderParams',
        name: '_orderParams',
        type: 'tuple'
      },
      {
        components: [
          {
            internalType: 'address',
            name: 'exchangeContract',
            type: 'address'
          },
          { internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' },
          {
            internalType: 'uint256',
            name: 'maxBaseTokenAmount',
            type: 'uint256'
          },
          { internalType: 'uint256', name: 'swapMarketFee', type: 'uint256' },
          { internalType: 'address', name: 'marketFeeAddress', type: 'address' }
        ],
        internalType: 'struct ERC20TemplateEnterprise.FreParams',
        name: '_freParams',
        type: 'tuple'
      }
    ],
    name: 'buyFromFreAndOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'cap',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'cleanFrom721',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'cleanPermissions',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '_dispenser', type: 'address' },
      { internalType: 'uint256', name: 'maxTokens', type: 'uint256' },
      { internalType: 'uint256', name: 'maxBalance', type: 'uint256' },
      { internalType: 'bool', name: 'withMint', type: 'bool' },
      { internalType: 'address', name: '', type: 'address' }
    ],
    name: 'createDispenser',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'fixedPriceAddress', type: 'address' },
      { internalType: 'address[]', name: 'addresses', type: 'address[]' },
      { internalType: 'uint256[]', name: 'uints', type: 'uint256[]' }
    ],
    name: 'createFixedRate',
    outputs: [{ internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'subtractedValue', type: 'uint256' }
    ],
    name: 'decreaseAllowance',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getDispensers',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getERC721Address',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getFixedRates',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'contractAddress', type: 'address' },
          { internalType: 'bytes32', name: 'id', type: 'bytes32' }
        ],
        internalType: 'struct ERC20TemplateEnterprise.fixedRate[]',
        name: '',
        type: 'tuple[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getId',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getPaymentCollector',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getPermissions',
    outputs: [
      {
        components: [
          { internalType: 'bool', name: 'minter', type: 'bool' },
          { internalType: 'bool', name: 'paymentManager', type: 'bool' }
        ],
        internalType: 'struct ERC20Roles.RolesERC20',
        name: '',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getPublishingMarketFee',
    outputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'addedValue', type: 'uint256' }
    ],
    name: 'increaseAllowance',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'string[]', name: 'strings_', type: 'string[]' },
      { internalType: 'address[]', name: 'addresses_', type: 'address[]' },
      {
        internalType: 'address[]',
        name: 'factoryAddresses_',
        type: 'address[]'
      },
      { internalType: 'uint256[]', name: 'uints_', type: 'uint256[]' },
      { internalType: 'bytes[]', name: 'bytes_', type: 'bytes[]' }
    ],
    name: 'initialize',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'isERC20Deployer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'isInitialized',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'isMinter',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' }
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'nonces',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'orderTxId', type: 'bytes32' },
      { internalType: 'bytes', name: 'providerData', type: 'bytes' },
      { internalType: 'bytes', name: 'providerSignature', type: 'bytes' },
      { internalType: 'bytes', name: 'consumerData', type: 'bytes' },
      { internalType: 'bytes', name: 'consumerSignature', type: 'bytes' },
      { internalType: 'address', name: 'consumerAddress', type: 'address' }
    ],
    name: 'orderExecuted',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'permissions',
    outputs: [
      { internalType: 'bool', name: 'minter', type: 'bool' },
      { internalType: 'bool', name: 'paymentManager', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' }
    ],
    name: 'permit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '_minter', type: 'address' }],
    name: 'removeMinter',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '_paymentManager', type: 'address' }
    ],
    name: 'removePaymentManager',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'orderTxId', type: 'bytes32' },
      {
        components: [
          {
            internalType: 'address',
            name: 'providerFeeAddress',
            type: 'address'
          },
          {
            internalType: 'address',
            name: 'providerFeeToken',
            type: 'address'
          },
          {
            internalType: 'uint256',
            name: 'providerFeeAmount',
            type: 'uint256'
          },
          { internalType: 'uint8', name: 'v', type: 'uint8' },
          { internalType: 'bytes32', name: 'r', type: 'bytes32' },
          { internalType: 'bytes32', name: 's', type: 'bytes32' },
          { internalType: 'uint256', name: 'validUntil', type: 'uint256' },
          { internalType: 'bytes', name: 'providerData', type: 'bytes' }
        ],
        internalType: 'struct ERC20TemplateEnterprise.providerFee',
        name: '_providerFee',
        type: 'tuple'
      }
    ],
    name: 'reuseOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'router',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'bytes', name: '_value', type: 'bytes' }],
    name: 'setData',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '_newPaymentCollector', type: 'address' }
    ],
    name: 'setPaymentCollector',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_publishMarketFeeAddress',
        type: 'address'
      },
      {
        internalType: 'address',
        name: '_publishMarketFeeToken',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: '_publishMarketFeeAmount',
        type: 'uint256'
      }
    ],
    name: 'setPublishingMarketFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'consumer', type: 'address' },
      { internalType: 'uint256', name: 'serviceIndex', type: 'uint256' },
      {
        components: [
          {
            internalType: 'address',
            name: 'providerFeeAddress',
            type: 'address'
          },
          {
            internalType: 'address',
            name: 'providerFeeToken',
            type: 'address'
          },
          {
            internalType: 'uint256',
            name: 'providerFeeAmount',
            type: 'uint256'
          },
          { internalType: 'uint8', name: 'v', type: 'uint8' },
          { internalType: 'bytes32', name: 'r', type: 'bytes32' },
          { internalType: 'bytes32', name: 's', type: 'bytes32' },
          { internalType: 'uint256', name: 'validUntil', type: 'uint256' },
          { internalType: 'bytes', name: 'providerData', type: 'bytes' }
        ],
        internalType: 'struct ERC20TemplateEnterprise.providerFee',
        name: '_providerFee',
        type: 'tuple'
      },
      {
        components: [
          {
            internalType: 'address',
            name: 'consumeMarketFeeAddress',
            type: 'address'
          },
          {
            internalType: 'address',
            name: 'consumeMarketFeeToken',
            type: 'address'
          },
          {
            internalType: 'uint256',
            name: 'consumeMarketFeeAmount',
            type: 'uint256'
          }
        ],
        internalType: 'struct ERC20TemplateEnterprise.consumeMarketFee',
        name: '_consumeMarketFee',
        type: 'tuple'
      }
    ],
    name: 'startOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'transferFrom',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'withdrawETH',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  { stateMutability: 'payable', type: 'receive' }
]

export default abiInstance
