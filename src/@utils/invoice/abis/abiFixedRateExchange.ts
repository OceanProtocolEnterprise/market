const abiFixedRateExchange = [
  {
    inputs: [{ internalType: 'address', name: '_router', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'exchangeId',
        type: 'bytes32'
      },
      { indexed: false, internalType: 'address', name: 'to', type: 'address' },
      {
        indexed: false,
        internalType: 'address',
        name: 'token',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
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
        indexed: true,
        internalType: 'bytes32',
        name: 'exchangeId',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'exchangeOwner',
        type: 'address'
      }
    ],
    name: 'ExchangeActivated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'exchangeId',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'allowedSwapper',
        type: 'address'
      }
    ],
    name: 'ExchangeAllowedSwapperChanged',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'exchangeId',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'baseToken',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'datatoken',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'exchangeOwner',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'fixedRate',
        type: 'uint256'
      }
    ],
    name: 'ExchangeCreated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'exchangeId',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'exchangeOwner',
        type: 'address'
      }
    ],
    name: 'ExchangeDeactivated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'exchangeId',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'exchangeOwner',
        type: 'address'
      },
      { indexed: false, internalType: 'bool', name: 'withMint', type: 'bool' }
    ],
    name: 'ExchangeMintStateChanged',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'exchangeId',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'exchangeOwner',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'newRate',
        type: 'uint256'
      }
    ],
    name: 'ExchangeRateChanged',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'exchangeId',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'feeToken',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'feeAmount',
        type: 'uint256'
      }
    ],
    name: 'MarketFeeCollected',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'exchangeId',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'feeToken',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'feeAmount',
        type: 'uint256'
      }
    ],
    name: 'OceanFeeCollected',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'exchangeId',
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
        internalType: 'address',
        name: 'newMarketCollector',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'swapFee',
        type: 'uint256'
      }
    ],
    name: 'PublishMarketFeeChanged',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'exchangeId',
        type: 'bytes32'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'oceanFeeAmount',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'marketFeeAmount',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'consumeMarketFeeAmount',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'tokenFeeAddress',
        type: 'address'
      }
    ],
    name: 'SWAP_FEES',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'exchangeId',
        type: 'bytes32'
      },
      { indexed: true, internalType: 'address', name: 'by', type: 'address' },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'baseTokenSwappedAmount',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'datatokenSwappedAmount',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'tokenOutAddress',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'marketFeeAmount',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'oceanFeeAmount',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'consumeMarketFeeAmount',
        type: 'uint256'
      }
    ],
    name: 'Swapped',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'exchangeId',
        type: 'bytes32'
      },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      {
        indexed: true,
        internalType: 'address',
        name: 'token',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'TokenCollected',
    type: 'event'
  },
  {
    inputs: [],
    name: 'MAX_FEE',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'MIN_FEE',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'MIN_RATE',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' },
      { internalType: 'uint256', name: 'datatokenAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'maxBaseTokenAmount', type: 'uint256' },
      {
        internalType: 'address',
        name: 'consumeMarketAddress',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'consumeMarketSwapFeeAmount',
        type: 'uint256'
      }
    ],
    name: 'buyDT',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' },
      { internalType: 'uint256', name: 'datatokenAmount', type: 'uint256' },
      {
        internalType: 'uint256',
        name: 'consumeMarketSwapFeeAmount',
        type: 'uint256'
      }
    ],
    name: 'calcBaseInGivenOutDT',
    outputs: [
      { internalType: 'uint256', name: 'baseTokenAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'oceanFeeAmount', type: 'uint256' },
      {
        internalType: 'uint256',
        name: 'publishMarketFeeAmount',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'consumeMarketFeeAmount',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' },
      { internalType: 'uint256', name: 'datatokenAmount', type: 'uint256' },
      {
        internalType: 'uint256',
        name: 'consumeMarketSwapFeeAmount',
        type: 'uint256'
      }
    ],
    name: 'calcBaseOutGivenInDT',
    outputs: [
      { internalType: 'uint256', name: 'baseTokenAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'oceanFeeAmount', type: 'uint256' },
      {
        internalType: 'uint256',
        name: 'publishMarketFeeAmount',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'consumeMarketFeeAmount',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'collectBT',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'collectDT',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' }],
    name: 'collectMarketFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' }],
    name: 'collectOceanFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'datatoken', type: 'address' },
      { internalType: 'address[]', name: 'addresses', type: 'address[]' },
      { internalType: 'uint256[]', name: 'uints', type: 'uint256[]' }
    ],
    name: 'createWithDecimals',
    outputs: [{ internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'baseToken', type: 'address' },
      { internalType: 'address', name: 'datatoken', type: 'address' }
    ],
    name: 'generateExchangeId',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' }],
    name: 'getAllowedSwapper',
    outputs: [
      { internalType: 'address', name: 'allowedSwapper', type: 'address' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' }],
    name: 'getBTSupply',
    outputs: [{ internalType: 'uint256', name: 'supply', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' }],
    name: 'getDTSupply',
    outputs: [{ internalType: 'uint256', name: 'supply', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' }],
    name: 'getExchange',
    outputs: [
      { internalType: 'address', name: 'exchangeOwner', type: 'address' },
      { internalType: 'address', name: 'datatoken', type: 'address' },
      { internalType: 'uint256', name: 'dtDecimals', type: 'uint256' },
      { internalType: 'address', name: 'baseToken', type: 'address' },
      { internalType: 'uint256', name: 'btDecimals', type: 'uint256' },
      { internalType: 'uint256', name: 'fixedRate', type: 'uint256' },
      { internalType: 'bool', name: 'active', type: 'bool' },
      { internalType: 'uint256', name: 'dtSupply', type: 'uint256' },
      { internalType: 'uint256', name: 'btSupply', type: 'uint256' },
      { internalType: 'uint256', name: 'dtBalance', type: 'uint256' },
      { internalType: 'uint256', name: 'btBalance', type: 'uint256' },
      { internalType: 'bool', name: 'withMint', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getExchanges',
    outputs: [{ internalType: 'bytes32[]', name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' }],
    name: 'getFeesInfo',
    outputs: [
      { internalType: 'uint256', name: 'marketFee', type: 'uint256' },
      { internalType: 'address', name: 'marketFeeCollector', type: 'address' },
      { internalType: 'uint256', name: 'opcFee', type: 'uint256' },
      { internalType: 'uint256', name: 'marketFeeAvailable', type: 'uint256' },
      { internalType: 'uint256', name: 'oceanFeeAvailable', type: 'uint256' }
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
    inputs: [{ internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' }],
    name: 'getMarketFee',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getNumberOfExchanges',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'baseTokenAddress', type: 'address' }
    ],
    name: 'getOPCFee',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' }],
    name: 'getRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' }],
    name: 'isActive',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
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
    inputs: [
      { internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' },
      { internalType: 'uint256', name: 'datatokenAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'minBaseTokenAmount', type: 'uint256' },
      {
        internalType: 'address',
        name: 'consumeMarketAddress',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: 'consumeMarketSwapFeeAmount',
        type: 'uint256'
      }
    ],
    name: 'sellDT',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' },
      { internalType: 'address', name: 'newAllowedSwapper', type: 'address' }
    ],
    name: 'setAllowedSwapper',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' },
      { internalType: 'uint256', name: 'newRate', type: 'uint256' }
    ],
    name: 'setRate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' }],
    name: 'toggleExchangeState',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' },
      { internalType: 'bool', name: 'withMint', type: 'bool' }
    ],
    name: 'toggleMintState',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' },
      { internalType: 'uint256', name: '_newMarketFee', type: 'uint256' }
    ],
    name: 'updateMarketFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'exchangeId', type: 'bytes32' },
      { internalType: 'address', name: '_newMarketCollector', type: 'address' }
    ],
    name: 'updateMarketFeeCollector',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
]

export default abiFixedRateExchange
