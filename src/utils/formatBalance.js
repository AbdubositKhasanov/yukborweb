/**
 * Format balance to Uzbek currency format
 * @param {number|null|undefined} balance - Balance amount
 * @returns {string} Formatted balance string
 * 
 * Examples:
 * formatBalance(12500) => "12 500 so'm"
 * formatBalance(12500.50) => "12 500.50 so'm"
 * formatBalance(0) => "0 so'm"
 * formatBalance(null) => "0 so'm"
 * formatBalance(undefined) => "0 so'm"
 */
export const formatBalance = (balance) => {
  // Handle null, undefined, or non-numeric values
  if (balance === null || balance === undefined || isNaN(balance)) {
    return "0 so'm";
  }

  // Convert to number
  const amount = Number(balance);

  // Check if it's a whole number or has decimals
  const hasDecimals = amount % 1 !== 0;

  // Format number with spaces (thousands separator)
  const formattedNumber = hasDecimals
    ? amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    : amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return `${formattedNumber} so'm`;
};

/**
 * Get balance color based on amount
 * @param {number} balance - Balance amount
 * @returns {string} CSS color
 */
export const getBalanceColor = (balance) => {
  if (balance === null || balance === undefined || balance === 0) {
    return '#999'; // Gray for zero/null
  }
  if (balance < 0) {
    return '#dc3545'; // Red for negative
  }
  if (balance < 10000) {
    return '#ffc107'; // Yellow/Warning for low balance
  }
  return '#28a745'; // Green for good balance
};

/**
 * Format balance with currency symbol
 * @param {number} balance - Balance amount
 * @returns {object} Object with formatted value and color
 */
export const getBalanceDisplay = (balance) => {
  return {
    formatted: formatBalance(balance),
    color: getBalanceColor(balance),
    icon: balance > 0 ? '💰' : '💳',
  };
};
