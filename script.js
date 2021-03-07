'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  };

  _setDescription() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
     'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUppercase()}${this.type.slice(1)}
 on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
};

class Running extends Workout {
  type = 'running'

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  };

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  };
};

class Cycling extends Workout {
  type = 'cycling'

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevation = elevationGain;
    this.calcSpeed();
    this._setDescription();
  };

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  };
};

///////////////////////////////////////////
// APPLICATION ARCHITECURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getPosition();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
  };

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),
      function() {
        alert(`Couldn't get your position.`);
      });
    };

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyr\
      ight">OpenStreetMap</a> contributors'
    }).addTo(this.#map);

    L.marker(coords)
      .addTo(this.#map)
      .bindPopup(`Close to house.`)
      .openPopup();

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));
  };

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  };

  _toggleElevationField() {
      inputElevation
        .closest('.form__row')
        .classList
        .toggle('form__row--hidden');
      inputCadence
        .closest('.form__row')
        .classList
        .toggle('form__row--hidden');
  };

  _newWorkout(e) {
    e.preventDefault()
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    const validInputs = (...inputs) => inputs.every(inp =>
      Number.isFinite(inp));


    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const {lat, lng} = this.#mapEvent.latlng;
    let workout;

    // If the workout is running, create a running object
    if(type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if(
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers.');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If the workout is cycling, create a cycling object
    if(type === 'cycling') {
      const elevation = +inputElevation.value;

      // Check if data is valid
      if(
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert(
          'Inputs other than elevation have to be positive numbers.'
        );

      workout = new Cycling([lat, lng], distance, duration, elevation);
    };

    // Add new object to workout array
    this.#workouts.push(workout)

    // Clear the input form
    inputDistance.value = inputCadence.value =
    inputElevation.value = inputDuration.value = ''
    form.classList.add('hidden')

    // Display the marker
    this._renderWorkoutMarker(workout);
    };

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(L.popup({
        maxWidth: 250,
        minWidth: 100,
        autoClose: false,
        closeOnClick: false,
        className: `${workout.type}-popup`,
      }))
      .setPopupContent(workout.distance)
      .openPopup();
  };

  // Render workout on map as marker
  _renderWorkout(workout) {

    let html = `
      <li class="workout workout--${workout.type}" data-id='${workout.id}'>
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.type==='running'?'🏃‍':'🚴'}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>`

    if(workout.type === 'running')
          html += `
            <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.pace.toFixed(1)}</span>
              <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">🦶🏼</span>
              <span class="workout__value">${workout.cadence}</span>
              <span class="workout__unit">spm</span>
            </div>
          </li>
          `;

      if(workout.type === 'cycling')
            html += `
            <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.speed.toFixed(1)}</span>
              <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⛰</span>
              <span class="workout__value">${workout.elevationGain}</span>
              <span class="workout__unit">m</span>
            </div>
          </li>
            `;

  };

    // Render workout on list

};

const app = new App();
