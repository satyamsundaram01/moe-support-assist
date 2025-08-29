import React from 'react';
import type { PlatformInfo } from './types';

interface PlatformIconProps {
  platform: PlatformInfo;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PlatformIcon: React.FC<PlatformIconProps> = ({ 
  platform, 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const iconSize = sizeClasses[size];

  const renderIcon = () => {
    switch (platform.icon) {
      case 'reddit':
        return (
          <svg className={`${iconSize} ${className}`} viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill={platform.color}/>
            <text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">R</text>
          </svg>
        );

      case 'medium':
        return (
          <svg className={`${iconSize} ${className}`} viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill={platform.color}/>
            <text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">M</text>
          </svg>
        );

      case 'threads':
        return (
          <svg className={`${iconSize} ${className}`} viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill={platform.color}/>
            <text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">T</text>
          </svg>
        );

      case 'instagram':
        return (
          <svg className={`${iconSize} ${className}`} viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill={platform.color}/>
            <text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">IG</text>
          </svg>
        );

      case 'snapchat':
        return (
          <svg className={`${iconSize} ${className}`} viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill={platform.color}/>
            <text x="12" y="16" textAnchor="middle" fill="black" fontSize="8" fontWeight="bold">S</text>
          </svg>
        );

      case 'facebook':
        return (
          <svg className={`${iconSize} ${className}`} viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill={platform.color}/>
            <text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">F</text>
          </svg>
        );

      case 'google':
        return (
          <svg className={`${iconSize} ${className}`} viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill={platform.color}/>
            <text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">G</text>
          </svg>
        );

      case 'pinterest':
        return (
          <svg className={`${iconSize} ${className}`} viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill={platform.color}/>
            <text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">P</text>
          </svg>
        );

      case 'rss':
        return (
          <svg className={`${iconSize} ${className}`} viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill={platform.color}/>
            <text x="12" y="16" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">RSS</text>
          </svg>
        );

      case 'confluence':
        return (
          <svg className={`${iconSize} ${className}`} viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill={platform.color}/>
            <text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">C</text>
          </svg>
        );

      case 'moengage':
        return (
          <svg className={`${iconSize} ${className}`} viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill={platform.color}/>
            <text x="12" y="16" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">MOE</text>
          </svg>
        );

      case 'link':
      default:
        return (
          <svg className={`${iconSize} ${className}`} viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill={platform.color}/>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="white" strokeWidth="2" fill="none"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="white" strokeWidth="2" fill="none"/>
          </svg>
        );
    }
  };

  return (
    <div 
      className="inline-flex items-center justify-center rounded-full"
      style={{ color: platform.color }}
    >
      {renderIcon()}
    </div>
  );
};

// Multi-platform icon for sources button
interface MultiPlatformIconProps {
  platforms: PlatformInfo[];
  size?: 'sm' | 'md' | 'lg';
  maxVisible?: number;
  className?: string;
}

export const MultiPlatformIcon: React.FC<MultiPlatformIconProps> = ({
  platforms,
  size = 'md',
  maxVisible = 5,
  className = ''
}) => {
  const visiblePlatforms = platforms.slice(0, maxVisible);
  const remainingCount = platforms.length - maxVisible;

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {visiblePlatforms.map((platform, index) => (
        <PlatformIcon
          key={`${platform.domain}-${index}`}
          platform={platform}
          size={size}
        />
      ))}
      {remainingCount > 0 && (
        <span className="text-xs text-gray-500 ml-1">
          +{remainingCount}
        </span>
      )}
    </div>
  );
};
