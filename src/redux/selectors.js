import { distance, point } from "@turf/turf";
import { createSelector } from "reselect";

const getProviderTypesIds = state => state.providerTypes.allIds;
const getProviderTypesById = state => state.providerTypes.byId;
const getVisibleProviderTypes = state => state.providerTypes.visible;
const getProvidersById = state => state.providers.byId;
const getDistance = state => state.filters.distance;
const getSavedProvidersIds = state => state.providers.savedProviders;
const getHighlightedProvidersList = state => state.highlightedProviders;
const getSearchCoordinates = state => state.search.history[state.search.currentLocation];
// const getSearchCoordinates = state => state.search.currentLocation ? state.search.history[state.search.currentLocation] : null; // TODO: separate coordinates and searched location

export const getProvidersSorted = createSelector(
  [
    getProviderTypesById,
    getVisibleProviderTypes,
    getProvidersById,
    getDistance,
    getSearchCoordinates
    // visa status,
    // accepting new clients,
    // sort criterion
  ],
  (
    providerTypesById,
    visibleProviderTypes,
    providersById,
    distance,
    searchCoordinates
  ) => {
    const sortMethod = "DISTANCE"; // TODO: remove after implementing alphabetical sort and tracking sort method in state

    // for each provider type that is active, get providers belonging to it that are near the search location
    // TODO: limit based on new client status and visa type
    let groupedByProviderType = visibleProviderTypes.map(id => {
      let providerType = providerTypesById[id];
      let providers = providerType.providers.map(provId => providersById[provId]);
      const options = { units: "miles" };
      let providersWithDistances = calculateProviderDistances(
        providers,
        searchCoordinates,
        options
      )
      let nearbyProviders = distance ? getProvidersWithinDistance( providersWithDistances, distance ) : providersWithDistances;
      return {
        ...providerType,
        providers: nearbyProviders
      }
    });

    // sort and return an array of grouped providers
    // (for distance and alphabetical, it's a single-object array)
    switch (sortMethod) {
      case "DISTANCE":
        let flattenedProviders = groupedByProviderType.reduce( (result, type) => result.concat(type.providers), [] )
        let sortedByDistance = sortProvidersByDistance(flattenedProviders)
        return [{
          id: "distance-sort",
          name: "Closest to farthest",
          providers: sortedByDistance
        }]
      case "NAME": // TODO
      case "PROVIDER_TYPE":
      default:
        return groupedByProviderType;
    }

  }
);

export const getSavedProviders = createSelector(
  [getSavedProvidersIds, getProvidersById, getSearchCoordinates],
  (savedProvidersIds, providersById, searchCoordinates) => {
    if (!searchCoordinates) {
      // no distance information included
      return savedProvidersIds.map(id => providersById[id])
    }
    return savedProvidersIds.map(id => {
      const provDistance = distance(
        // TODO use coordinates from search history when provider was saved
        point(providersById[id].coordinates),
        point(searchCoordinates.coordinates),
        { units: "miles" }
      )
      return {
        ...providersById[id],
        distance: provDistance
      }
    })
  }
);

export const getHighlightedProviders = createSelector(
  [getProvidersById, getHighlightedProvidersList],
  (providersById, highlightedProvidersList) => {
    return highlightedProvidersList.map(id => providersById[id]);
  }
);

function calculateProviderDistances(
  providers,
  refLocation,
  options
) {
  var referencePoint = point(refLocation.coordinates);
  return providers.map( provider => {
    // New object with the distance attached
    return {
      ...provider,
      distance: distance(point(provider.coordinates), referencePoint, options)
    }
  })
}


function getProvidersWithinDistance(
  providers,
  maxDistance,
) {
  return providers.filter( provider => maxDistance && provider.distance < maxDistance )
}

function sortProvidersByDistance(providerArray) {
    // Sort the list by distance
    return providerArray.sort(
      (a, b) => a.distance - b.distance
    );
}