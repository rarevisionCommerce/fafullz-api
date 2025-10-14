// utils/stateFilterBuilder.js

const stateMap = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

/**
 * Builds a MongoDB filter to match both state abbreviation and full name,
 * ignoring case. e.g., "la" → matches "LA", "la", "lA", "Louisiana", "louisiana"
 *
 * @param {string} state - The state abbreviation or full name
 * @returns {object} MongoDB query filter
 */
const buildStateFilter = (state) => {
  if (!state) return {};

  const upperState = state.toUpperCase();
  const fullState = stateMap[upperState];

  if (fullState) {
    // Matches abbreviation or full name in any case
    return {
      $or: [
        { state: { $regex: `^${upperState}$`, $options: "i" } },
        { state: { $regex: `^${fullState}$`, $options: "i" } },
      ],
    };
  }

  // Fallback — search the text itself ignoring case
  return { state: { $regex: `^${state}$`, $options: "i" } };
};

module.exports = { buildStateFilter, stateMap };
