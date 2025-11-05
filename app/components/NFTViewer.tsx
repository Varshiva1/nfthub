'use client';

import React, { useState } from 'react';
import { Search, ImageIcon, ExternalLink, Wallet, Grid3x3, List, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { sdk } from '@farcaster/miniapp-sdk';

interface NFT {
  tokenId: string;
  name: string;
  description: string;
  imageUrl: string;
  contractAddress: string;
  chain: string;
  collectionName: string;
  externalUrl?: string;
}

interface AlchemyNFT {
  contract: {
    address: string;
    name?: string;
  };
  tokenId: string;
  title: string;
  description: string;
  media: Array<{
    gateway: string;
  }>;
  tokenUri?: {
    gateway: string;
  };
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
  ];

  const fetchNFTsFromAlchemy = async (walletAddress: string, chain: typeof CHAINS[0]) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      
      if (!apiKey) {
        console.warn('Alchemy API key not set');
        return [];
      }

      const response = await fetch(
        `https://${chain.alchemyNetwork}.g.alchemy.com/v2/${apiKey}/getNFTs?owner=${walletAddress}&withMetadata=true`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch from ${chain.name}`);
      }

      const data = await response.json();
      
      return data.ownedNfts.map((nft: AlchemyNFT) => ({
        tokenId: nft.tokenId,
        name: nft.title || `${nft.contract.name || 'Unknown'} #${nft.tokenId}`,
        description: nft.description || 'No description available',
        imageUrl: nft.media[0]?.gateway || nft.tokenUri?.gateway || '',
        contractAddress: nft.contract.address,
        chain: chain.name,
        collectionName: nft.contract.name || 'Unknown Collection',
      }));
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
      // Fetch NFTs from all chains in parallel
      const allNFTPromises = CHAINS.map(chain => 
        fetchNFTsFromAlchemy(address, chain)
      );

      const results = await Promise.all(allNFTPromises);
      const allNFTs = results.flat().filter(nft => nft.imageUrl); // Only show NFTs with images

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
    const chainData = CHAINS.find(c => c.name === chain);
    return chainData?.color || '#6B7280';
  };

  const getExplorerUrl = (chain: string, contract: string, tokenId: string) => {
    const explorers: { [key: string]: string } = {
      'Ethereum': `https://etherscan.io/nft/${contract}/${tokenId}`,
      'Base': `https://basescan.org/nft/${contract}/${tokenId}`,
      'Polygon': `https://polygonscan.com/nft/${contract}/${tokenId}`,
      'Optimism': `https://optimistic.etherscan.io/nft/${contract}/${tokenId}`,
      'Arbitrum': `https://arbiscan.io/nft/${contract}/${tokenId}`,
    };
    return explorers[chain] || '#';
  };

  if (!mounted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Loader2 style={{ width: '3rem', height: '3rem', color: 'white', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '1rem',
    }}>
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '2rem',
          paddingTop: '1rem',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '4rem',
            height: '4rem',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            marginBottom: '1rem',
          }}>
            <ImageIcon style={{ width: '2rem', height: '2rem', color: 'white' }} />
          </div>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: 'white',
            margin: '0 0 0.5rem 0',
          }}>NFT Capsule Viewer</h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '1.125rem',
            margin: 0,
          }}>Discover NFTs across Ethereum, Base, Polygon, Optimism & Arbitrum</p>
        </div>

        {/* Search Bar */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '1rem',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
              <Wallet style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6B7280',
                width: '1.25rem',
                height: '1.25rem',
              }} />
              <input
                type="text"
                placeholder="Enter wallet address (0x...)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem 0.875rem 3rem',
                  border: '2px solid #E5E7EB',
                  borderRadius: '0.75rem',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.875rem 1.5rem',
                background: loading ? '#9CA3AF' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#5568d3')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#667eea')}
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
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: '0.5rem',
              color: '#991B1B',
              fontSize: '0.875rem',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Chain Badges */}
        {!loading && nfts.length === 0 && !error && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '1rem',
            padding: '2rem',
            marginBottom: '2rem',
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#1F2937',
              margin: '0 0 1rem 0',
            }}>Supported Networks:</h3>
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}>
              {CHAINS.map((chain) => (
                <div
                  key={chain.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: chain.color + '15',
                    color: chain.color,
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                  }}
                >
                  <div style={{
                    width: '0.5rem',
                    height: '0.5rem',
                    borderRadius: '50%',
                    background: chain.color,
                  }} />
                  {chain.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View Mode Toggle & Results Count */}
        {nfts.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            padding: '0 0.5rem',
          }}>
            <p style={{
              color: 'white',
              fontSize: '1.125rem',
              fontWeight: '600',
              margin: 0,
            }}>
              Found {nfts.length} NFTs across {new Set(nfts.map(n => n.chain)).size} chains
            </p>
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '0.25rem',
              borderRadius: '0.5rem',
            }}>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '0.5rem',
                  background: viewMode === 'grid' ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Grid3x3 style={{
                  width: '1.25rem',
                  height: '1.25rem',
                  color: viewMode === 'grid' ? '#667eea' : 'white',
                }} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  padding: '0.5rem',
                  background: viewMode === 'list' ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(250px, 1fr))' : '1fr',
            gap: '1.5rem',
          }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '1rem',
                overflow: 'hidden',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}>
                <div style={{
                  width: '100%',
                  paddingBottom: '100%',
                  background: '#E5E7EB',
                }} />
                <div style={{ padding: '1rem' }}>
                  <div style={{ height: '1.5rem', background: '#E5E7EB', borderRadius: '0.25rem', marginBottom: '0.5rem' }} />
                  <div style={{ height: '1rem', background: '#E5E7EB', borderRadius: '0.25rem', width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* NFT Grid/List */}
        {!loading && nfts.length > 0 && (
          <div style={{
            display: viewMode === 'grid' ? 'grid' : 'flex',
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : undefined,
            flexDirection: viewMode === 'list' ? 'column' : undefined,
            gap: '1.5rem',
          }}>
            {nfts.map((nft, index) => (
              <div
                key={`${nft.contractAddress}-${nft.tokenId}-${index}`}
                onClick={() => setSelectedNFT(nft)}
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '1rem',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  display: viewMode === 'list' ? 'flex' : 'block',
                  gap: viewMode === 'list' ? '1rem' : undefined,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Image */}
                <div style={{
                  width: viewMode === 'list' ? '200px' : '100%',
                  paddingBottom: viewMode === 'list' ? undefined : '100%',
                  height: viewMode === 'list' ? '200px' : undefined,
                  position: 'relative',
                  background: '#F3F4F6',
                  flexShrink: 0,
                }}>
                  {nft.imageUrl ? (
                    <Image
                      src={nft.imageUrl}
                      alt={nft.name}
                      fill
                      sizes={viewMode === 'list' ? '200px' : '280px'}
                      style={{ objectFit: 'cover' }}
                      unoptimized
                    />
                  ) : (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                    }}>
                      <ImageIcon style={{ width: '3rem', height: '3rem', color: '#D1D5DB' }} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '1rem', flex: 1 }}>
                  <div style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.75rem',
                    background: getChainColor(nft.chain) + '20',
                    color: getChainColor(nft.chain),
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                  }}>
                    {nft.chain}
                  </div>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: 'bold',
                    color: '#1F2937',
                    margin: '0 0 0.25rem 0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>{nft.name}</h3>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6B7280',
                    margin: '0 0 0.5rem 0',
                  }}>{nft.collectionName}</p>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#9CA3AF',
                    margin: 0,
                    fontFamily: 'monospace',
                  }}>
                    {truncateAddress(nft.contractAddress)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && nfts.length === 0 && !error && (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '1rem',
          }}>
            <ImageIcon style={{
              width: '4rem',
              height: '4rem',
              color: '#D1D5DB',
              margin: '0 auto 1rem',
            }} />
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#4B5563',
              margin: '0 0 0.5rem 0',
            }}>Ready to Explore</h3>
            <p style={{
              color: '#6B7280',
              margin: 0,
            }}>Enter a wallet address to discover NFTs across multiple chains</p>
          </div>
        )}

        {/* Modal for NFT Details */}
        {selectedNFT && (
          <div
            onClick={() => setSelectedNFT(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              zIndex: 1000,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'white',
                borderRadius: '1rem',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                position: 'relative',
              }}
            >
              <button
                onClick={() => setSelectedNFT(null)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '2.5rem',
                  height: '2.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                }}
              >
                <X style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} />
              </button>

              <div style={{ position: 'relative', width: '100%', paddingBottom: '100%' }}>
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

              <div style={{ padding: '2rem' }}>
                <div style={{
                  display: 'inline-block',
                  padding: '0.5rem 1rem',
                  background: getChainColor(selectedNFT.chain) + '20',
                  color: getChainColor(selectedNFT.chain),
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  marginBottom: '1rem',
                }}>
                  {selectedNFT.chain}
                </div>

                <h2 style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: '#1F2937',
                  margin: '0 0 0.5rem 0',
                }}>{selectedNFT.name}</h2>

                <p style={{
                  fontSize: '1.125rem',
                  color: '#6B7280',
                  margin: '0 0 1rem 0',
                }}>{selectedNFT.collectionName}</p>

                <p style={{
                  color: '#4B5563',
                  lineHeight: '1.6',
                  marginBottom: '1.5rem',
                }}>{selectedNFT.description}</p>

                <div style={{
                  background: '#F9FAFB',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem',
                }}>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6B7280',
                    margin: '0 0 0.25rem 0',
                  }}>Contract Address</p>
                  <p style={{
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    color: '#1F2937',
                    margin: 0,
                    wordBreak: 'break-all',
                  }}>{selectedNFT.contractAddress}</p>
                </div>

                <div
  style={{
    background: '#F9FAFB',
    padding: '1rem',
    borderRadius: '0.5rem',
    marginBottom: '1.5rem',
  }}
>
  <p
    style={{
      fontSize: '0.875rem',
      color: '#6B7280',
      margin: '0 0 0.25rem 0',
    }}
  >
    Token ID
  </p>
  <p
    style={{
      fontFamily: 'monospace',
      fontSize: '0.875rem',
      color: '#1F2937',
      margin: 0,
    }}
  >
    {selectedNFT.tokenId}
  </p>
</div>

<a
  href={getExplorerUrl(
    selectedNFT.chain,
    selectedNFT.contractAddress,
    selectedNFT.tokenId
  )}
  target="_blank"
  rel="noopener noreferrer"
  style={{
    width: '100%',
    padding: '1rem',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    textDecoration: 'none',
  }}
  onMouseEnter={(e) =>
    (e.currentTarget.style.background = '#5568d3')
  }
  onMouseLeave={(e) =>
    (e.currentTarget.style.background = '#667eea')
  }
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