import React from 'react';
import './LoadingSkeleton.css';

/**
 * Generic loading skeleton component
 */
export const Skeleton = ({ width = '100%', height = '20px', borderRadius = '4px', className = '' }) => {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
      }}
    />
  );
};

/**
 * Card loading skeleton
 */
export const CardSkeleton = () => {
  return (
    <div className="card-skeleton">
      <Skeleton height="200px" borderRadius="8px 8px 0 0" />
      <div style={{ padding: '20px' }}>
        <Skeleton width="70%" height="24px" />
        <Skeleton width="100%" height="16px" style={{ marginTop: '12px' }} />
        <Skeleton width="100%" height="16px" style={{ marginTop: '8px' }} />
        <Skeleton width="60%" height="16px" style={{ marginTop: '8px' }} />
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
          <Skeleton width="80px" height="36px" borderRadius="4px" />
          <Skeleton width="80px" height="36px" borderRadius="4px" />
        </div>
      </div>
    </div>
  );
};

/**
 * List loading skeleton
 */
export const ListSkeleton = ({ count = 5 }) => {
  return (
    <div className="list-skeleton">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="list-item-skeleton">
          <Skeleton width="60px" height="60px" borderRadius="50%" />
          <div style={{ flex: 1 }}>
            <Skeleton width="70%" height="20px" />
            <Skeleton width="50%" height="16px" style={{ marginTop: '8px' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Table loading skeleton
 */
export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="table-skeleton">
      {/* Header */}
      <div className="table-row-skeleton">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} height="20px" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="table-row-skeleton">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} height="16px" />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * Form loading skeleton
 */
export const FormSkeleton = () => {
  return (
    <div className="form-skeleton">
      <Skeleton width="30%" height="16px" />
      <Skeleton height="40px" style={{ marginTop: '8px' }} borderRadius="4px" />
      
      <Skeleton width="30%" height="16px" style={{ marginTop: '20px' }} />
      <Skeleton height="40px" style={{ marginTop: '8px' }} borderRadius="4px" />
      
      <Skeleton width="30%" height="16px" style={{ marginTop: '20px' }} />
      <Skeleton height="100px" style={{ marginTop: '8px' }} borderRadius="4px" />
      
      <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
        <Skeleton width="100px" height="40px" borderRadius="4px" />
        <Skeleton width="100px" height="40px" borderRadius="4px" />
      </div>
    </div>
  );
};

/**
 * Grid loading skeleton
 */
export const GridSkeleton = ({ count = 6, columns = 3 }) => {
  return (
    <div
      className="grid-skeleton"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '20px',
      }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
};

/**
 * Page loading skeleton (full page)
 */
export const PageSkeleton = () => {
  return (
    <div className="page-skeleton">
      <Skeleton width="300px" height="40px" />
      <Skeleton width="100%" height="2px" style={{ marginTop: '20px', marginBottom: '30px' }} />
      <GridSkeleton count={6} columns={3} />
    </div>
  );
};

export default Skeleton;
