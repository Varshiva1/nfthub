'use client';

import React, { useState } from 'react';
import { Search, ImageIcon, ExternalLink, Wallet, Grid3x3, List, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { sdk } from '@farcaster/miniapp-sdk';
import styles from './NFTViewer.module.css';

interface NFT {
  tokenId: string;
  name: string;
  description: string;
  imageUrl: string;
  contractAddress: string;
  chain: string;
  collectionName: string;
  floorPrice?: number | null;
}

interface AlchemyMedia {
  gateway?: string;
  thumbnail?: string;
  raw?: string;
  format?: string;
}

interface AlchemyContract {
  address: string;
  name?: string;
}

interface AlchemyContractMetadata {
  name?: string;
  symbol?: string;
  totalSupply?: string;
  tokenType?: string;
  openSea?: {
    collectionName?: string;
    imageUrl?: string;
    description?: string;
    floorPrice?: number; // <- Alchemy's OpenSea metadata field
  };
}

interface AlchemyNFT {
  contract: AlchemyContract;
  id: {
    tokenId: string;
  };
  balance?: string;
  title?: string;
  description?: string;
  tokenUri?: {
    gateway?: string;
    raw?: string;
  };
  media?: AlchemyMedia[];
  metadata?: any;
  timeLastUpdated?: string;
  contractMetadata?: AlchemyContractMetadata;
  spamInfo?: {
    isSpam?: string | boolean;
    classifications?: string[];
  };
}

interface AlchemyResponse {
  ownedNfts: AlchemyNFT[];
  totalCount?: number;
  pageKey?: string;
}

const NFTViewer = () => {
  const [address, setAddress] = useState('');
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);

    const initSDK = async () => {
      if (typeof window !== 'undefined') {
        try {
          await sdk.actions.ready();
        } catch (e) {
          console.error('SDK error:', e);
        }
      }
    };

    initSDK();
  }, []);

  const CHAINS = [
    { name: 'Ethereum', alchemyNetwork: 'eth-mainnet', color: '#627EEA' },
    { name: 'Base', alchemyNetwork: 'base-mainnet', color: '#0052FF' },
    { name: 'Polygon', alchemyNetwork: 'polygon-mainnet', color: '#8247E5' },
    { name: 'Optimism', alchemyNetwork: 'opt-mainnet', color: '#FF0420' },
    { name: 'Arbitrum', alchemyNetwork: 'arb-mainnet', color: '#28A0F0' },
    // { name: 'Avalanche', alchemyNetwork: 'avalanche-mainnet', color: '#E84142' },
    // { name: 'BNB Chain', alchemyNetwork: 'bnb-mainnet', color: '#F3BA2F' },
    { name: 'Linea', alchemyNetwork: 'linea-mainnet', color: '#00A1FF' },
    // { name: 'Mantle', alchemyNetwork: 'mantle-mainnet', color: '#FF8200' },
    { name: 'ZkSync', alchemyNetwork: 'zksync-mainnet', color: '#2855FF' },
  ] as const;

  const getNativeUnit = (chain: string) => {
    switch(chain) {
      case 'Polygon': return 'MATIC';
    //   case 'Avalanche': return 'AVAX';
    //   case 'BNB Chain': return 'BNB';
      case 'Linea': return 'LINEA';
    //   case 'Mantle': return 'MNT'; 
      case 'ZkSync': return 'ETH';
    
      default: return 'ETH';
    }
  };
  

  const extractImageUrl = (nft: AlchemyNFT): string => {
    // Priority 1: Media gateway
    if (nft.media && nft.media.length > 0) {
      const media = nft.media[0];
      if (media.gateway) return media.gateway;
      if (media.thumbnail) return media.thumbnail;
      if (media.raw && !media.raw.startsWith('data:')) return media.raw;
    }

    // Priority 2: Contract metadata OpenSea image
    if (nft.contractMetadata?.openSea?.imageUrl) {
      return nft.contractMetadata.openSea.imageUrl;
    }

    // Priority 3: Token URI
    if (nft.tokenUri?.gateway) {
      return nft.tokenUri.gateway;
    }

    // Priority 4: Try to parse metadata if it's a string
    if (typeof nft.metadata === 'string') {
      try {
        const parsed = JSON.parse(nft.metadata);
        if (parsed.image) return parsed.image;
      } catch {
        
      }
    }

    // Priority 5: Metadata object
    if (nft.metadata && typeof nft.metadata === 'object') {
      if (nft.metadata.image) return nft.metadata.image;
      if (nft.metadata.image_url) return nft.metadata.image_url;
      if (nft.metadata.imageUrl) return nft.metadata.imageUrl;
    }

    return '';
  };

  const fetchNFTsFromAlchemy = async (
    walletAddress: string,
    chain: typeof CHAINS[number]
  ) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

      if (!apiKey) {
        console.warn('Alchemy API key not set');
        return [];
      }

      const url = `https://${chain.alchemyNetwork}.g.alchemy.com/v2/${apiKey}/getNFTs?owner=${walletAddress}&withMetadata=true`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch from ${chain.name}`);
      }

      const data: AlchemyResponse = await response.json();

      return data.ownedNfts
        .filter((nft) => {
          const isSpam =
            nft.spamInfo?.isSpam === true ||
            nft.spamInfo?.isSpam === 'true';
          return !isSpam;
        })
        .map((nft: AlchemyNFT) => {
          // Extract collection name
          const collectionName =
            nft.contractMetadata?.name ||
            nft.contractMetadata?.openSea?.collectionName ||
            nft.contract.name ||
            'Unknown Collection';

          // Extract NFT name
          const tokenIdHex = nft.id.tokenId;
          const tokenIdDecimal = parseInt(tokenIdHex, 16);
          const nftName =
            nft.title ||
            nft.contractMetadata?.name ||
            `${collectionName} #${tokenIdDecimal}`;

          // Extract description
          const nftDescription =
            nft.description ||
            nft.contractMetadata?.openSea?.description ||
            'No description available';

          // Extract image URL
          const imageUrl = extractImageUrl(nft);

          // Extract floor price (OpenSea metadata if present)
          const floorPrice = nft.contractMetadata?.openSea?.floorPrice ?? null;

          return {
            tokenId: tokenIdDecimal.toString(),
            name: nftName,
            description: nftDescription,
            imageUrl,
            contractAddress: nft.contract.address,
            chain: chain.name,
            collectionName,
            floorPrice,
          } as NFT;
        })
        .filter((nft) => nft.imageUrl); // Only include NFTs with images
    } catch (err) {
      console.error(`Error fetching from ${chain.name}:`, err);
      return [];
    }
  };

  const handleSearch = async () => {
    if (!address.trim()) {
      setError('Please enter a valid wallet address');
      return;
    }

    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Invalid Ethereum address format');
      return;
    }

    setLoading(true);
    setError('');
    setNfts([]);

    try {
      const allNFTPromises = CHAINS.map((chain) =>
        fetchNFTsFromAlchemy(address, chain)
      );

      const results = await Promise.all(allNFTPromises);
      const allNFTs = results.flat();

      if (allNFTs.length === 0) {
        setError('No NFTs found for this address across any chain');
      } else {
        setNfts(allNFTs);
      }
    } catch (err) {
      setError('Failed to fetch NFTs. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getChainColor = (chain: string) => {
    const chainData = CHAINS.find((c) => c.name === chain);
    return chainData?.color || '#6B7280';
  };

  const getExplorerUrl = (chain: string, contract: string, tokenId: string) => {
    const explorers: { [key: string]: string } = {
      Ethereum: `https://etherscan.io/nft/${contract}/${tokenId}`,
      Base: `https://basescan.org/nft/${contract}/${tokenId}`,
      Polygon: `https://polygonscan.com/nft/${contract}/${tokenId}`,
      Optimism: `https://optimistic.etherscan.io/nft/${contract}/${tokenId}`,
      Arbitrum: `https://arbiscan.io/nft/${contract}/${tokenId}`,
    };
    return explorers[chain] || '#';
  };

  if (!mounted) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.loadingSpinner} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.iconContainer}>
            <ImageIcon style={{ width: '2rem', height: '2rem', color: 'white' }} />
          </div>
          <h1 className={styles.title}>NFT Capsule Viewer</h1>
          <p className={styles.subtitle}>Discover NFTs across Ethereum, Base, Polygon, Optimism & Arbitrum</p>
        </div>

        {/* Search Bar */}
        <div className={styles.searchContainer}>
          <div className={styles.searchBar}>
            <div className={styles.inputWrapper}>
              <Wallet className={styles.walletIcon} />
              <input
                type="text"
                placeholder="Enter wallet address (0x...)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className={styles.input}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className={styles.searchButton}
            >
              {loading ? (
                <>
                  <Loader2 style={{ width: '1.25rem', height: '1.25rem', animation: 'spin 1s linear infinite' }} />
                  Searching...
                </>
              ) : (
                <>
                  <Search style={{ width: '1.25rem', height: '1.25rem' }} />
                  Search NFTs
                </>
              )}
            </button>
          </div>

          {error && (
            <div className={styles.errorBox}>
              {error}
            </div>
          )}
        </div>

        {/* Chain Badges */}
        {!loading && nfts.length === 0 && !error && (
          <div className={styles.chainBadgesContainer}>
            <h3 className={styles.chainBadgesTitle}>Supported Networks:</h3>
            <div className={styles.chainBadges}>
              {CHAINS.map((chain) => (
                <div
                  key={chain.name}
                  className={styles.chainBadge}
                  style={{
                    background: chain.color + '15',
                    color: chain.color,
                  }}
                >
                  <div className={styles.chainDot} style={{ background: chain.color }} />
                  {chain.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {}
        {nfts.length > 0 && (
          <div className={styles.resultsBar}>
            <p className={styles.resultsText}>
              Found {nfts.length} NFTs across {new Set(nfts.map(n => n.chain)).size} chains
            </p>
            <div className={styles.viewModeToggle}>
              <button
                onClick={() => setViewMode('grid')}
                className={`${styles.viewModeButton} ${viewMode === 'grid' ? styles.active : ''}`}
              >
                <Grid3x3 style={{
                  width: '1.25rem',
                  height: '1.25rem',
                  color: viewMode === 'grid' ? '#667eea' : 'white',
                }} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`${styles.viewModeButton} ${viewMode === 'list' ? styles.active : ''}`}
              >
                <List style={{
                  width: '1.25rem',
                  height: '1.25rem',
                  color: viewMode === 'list' ? '#667eea' : 'white',
                }} />
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className={styles.skeletonGrid}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonImage} />
                <div className={styles.skeletonContent}>
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonLineShort} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* NFT Grid/List */}
        {!loading && nfts.length > 0 && (
          <div className={viewMode === 'grid' ? styles.nftGrid : styles.nftList}>
            {nfts.map((nft, index) => (
              <div
                key={`${nft.contractAddress}-${nft.tokenId}-${index}`}
                onClick={() => setSelectedNFT(nft)}
                className={`${styles.nftCard} ${viewMode === 'list' ? styles.nftCardList : ''}`}
              >
                <div className={viewMode === 'list' ? styles.nftImageWrapperList : styles.nftImageWrapper}>
                  {nft.imageUrl ? (
                    <Image
                      src={nft.imageUrl}
                      alt={nft.name}
                      fill
                      sizes={viewMode === 'list' ? '150px' : '210px'}
                      style={{ objectFit: 'cover' }}
                      unoptimized
                    />
                  ) : (
                    <div className={styles.nftImagePlaceholder}>
                      <ImageIcon style={{ width: '3rem', height: '3rem', color: '#D1D5DB' }} />
                    </div>
                  )}
                </div>

                <div className={styles.nftInfo}>
                  <div
                    className={styles.nftChainBadge}
                    style={{
                      background: getChainColor(nft.chain) + '20',
                      color: getChainColor(nft.chain),
                    }}
                  >
                    {nft.chain}
                  </div>
                  <h3 className={styles.nftName}>{nft.name}</h3>
                  <p className={styles.nftCollection}>{nft.collectionName}</p>

                  {typeof nft.floorPrice === 'number' && nft.floorPrice > 0 && (
                    <p className={styles.nftFloorPrice}>
                      Floor: <span>{nft.floorPrice.toFixed(2)} {getNativeUnit(nft.chain)}</span>
                    </p>
                  )}

                  <p className={styles.nftContract}>
                    {truncateAddress(nft.contractAddress)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && nfts.length === 0 && !error && (
          <div className={styles.emptyState}>
            <ImageIcon className={styles.emptyStateIcon} />
            <h3 className={styles.emptyStateTitle}>Ready to Explore</h3>
            <p className={styles.emptyStateText}>Enter a wallet address to discover NFTs across multiple chains</p>
          </div>
        )}

        {/* Modal for NFT Details */}
        {selectedNFT && (
          <div
            onClick={() => setSelectedNFT(null)}
            className={styles.modalOverlay}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={styles.modalContent}
            >
              <button
                onClick={() => setSelectedNFT(null)}
                className={styles.modalClose}
              >
                <X style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} />
              </button>

              <div className={styles.modalImageWrapper}>
                {selectedNFT.imageUrl && (
                  <Image
                    src={selectedNFT.imageUrl}
                    alt={selectedNFT.name}
                    fill
                    sizes="600px"
                    style={{ objectFit: 'cover' }}
                    unoptimized
                  />
                )}
              </div>

              <div className={styles.modalBody}>
                <div
                  className={styles.nftChainBadge}
                  style={{
                    background: getChainColor(selectedNFT.chain) + '20',
                    color: getChainColor(selectedNFT.chain),
                    padding: '0.5rem 1rem',
                    marginBottom: '1rem',
                  }}
                >
                  {selectedNFT.chain}
                </div>

                <h2 className={styles.modalTitle}>{selectedNFT.name}</h2>
                <p className={styles.modalCollection}>{selectedNFT.collectionName}</p>
                <p className={styles.modalDescription}>{selectedNFT.description}</p>

                {typeof selectedNFT.floorPrice === 'number' && selectedNFT.floorPrice > 0 && (
                  <div className={styles.modalInfoBox}>
                    <p className={styles.modalInfoLabel}>Floor Price</p>
                    <p className={styles.modalInfoValue}>
                      {selectedNFT.floorPrice.toFixed(2)} {getNativeUnit(selectedNFT.chain)}
                    </p>
                  </div>
                )}

                <div className={styles.modalInfoBox}>
                  <p className={styles.modalInfoLabel}>Contract Address</p>
                  <p className={styles.modalInfoValue}>{selectedNFT.contractAddress}</p>
                </div>

                <div className={styles.modalInfoBox}>
                  <p className={styles.modalInfoLabel}>Token ID</p>
                  <p className={styles.modalInfoValue}>{selectedNFT.tokenId}</p>
                </div>

                <a
                  href={getExplorerUrl(selectedNFT.chain, selectedNFT.contractAddress, selectedNFT.tokenId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.modalButton}
                >
                  <ExternalLink style={{ width: '1.25rem', height: '1.25rem' }} />
                  View on Explorer
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NFTViewer;
