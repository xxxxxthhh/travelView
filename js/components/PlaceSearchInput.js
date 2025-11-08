/**
 * PlaceSearchInput Component
 * Google Places Autocomplete integration for location search
 */

class PlaceSearchInput {
  constructor(options = {}) {
    this.inputId = options.inputId || 'place-search-input';
    this.onPlaceSelected = options.onPlaceSelected || (() => {});
    this.logger = new Logger({ prefix: '[PlaceSearchInput]', enabled: true });

    this.autocomplete = null;
    this.selectedPlace = null;
  }

  /**
   * Initialize the place search input
   * @param {HTMLElement} inputElement - The input element to attach autocomplete to
   */
  init(inputElement) {
    if (!inputElement) {
      this.logger.error('Input element not provided');
      return;
    }

    // Check if Google Maps API is loaded
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      this.logger.error('Google Maps Places API not loaded');
      return;
    }

    try {
      // Create autocomplete instance
      this.autocomplete = new google.maps.places.Autocomplete(inputElement, {
        fields: ['name', 'geometry', 'formatted_address', 'place_id', 'types'],
        types: ['establishment', 'geocode'] // Allow both places and addresses
      });

      // Listen for place selection
      this.autocomplete.addListener('place_changed', () => {
        this.handlePlaceChanged();
      });

      this.logger.info('Place search initialized');
    } catch (error) {
      this.logger.error('Failed to initialize place search', error);
    }
  }

  /**
   * Handle place selection
   */
  handlePlaceChanged() {
    const place = this.autocomplete.getPlace();

    if (!place.geometry) {
      this.logger.warn('No geometry found for selected place');
      return;
    }

    this.selectedPlace = {
      name: place.name || place.formatted_address || '',
      address: place.formatted_address || '',
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
      placeId: place.place_id,
      types: place.types || []
    };

    this.logger.info('Place selected', this.selectedPlace);

    // Notify callback
    this.onPlaceSelected(this.selectedPlace);
  }

  /**
   * Get selected place
   */
  getSelectedPlace() {
    return this.selectedPlace;
  }

  /**
   * Clear selected place
   */
  clear() {
    this.selectedPlace = null;
  }

  /**
   * Set place programmatically
   */
  setPlace(place) {
    this.selectedPlace = {
      name: place.name || '',
      address: place.address || '',
      lat: place.lat,
      lng: place.lng,
      placeId: place.placeId || '',
      types: place.types || []
    };
  }
}

// Make PlaceSearchInput available globally
window.PlaceSearchInput = PlaceSearchInput;
