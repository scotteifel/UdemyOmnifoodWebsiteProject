'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 1;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  };

  _setDescription() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
     'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)}
 on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  };

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

const editDistance = document.querySelector('.workout__edit--distance');
const deleteWorkoutButton = document.querySelector('.workout__delete');


class App {
  #workouts = [];
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #popups = []

  constructor() {
    // Get the users position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._editField.bind(this));
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
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    // this.#map.addEventListener('click', this._focusOnClickedWorkout);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyr\
      ight">OpenStreetMap</a> contributors'
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work)
    });
  };

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  };

  _hideForm() {
    // Empty the inputs
    inputDistance.value = inputCadence.value =
    inputElevation.value = inputDuration.value = '';

    // Make the new workout replace the form space instantly and hide the form
    form.style.display = `none`;
    form.classList.add('hidden');
    setTimeout(() => form.style.display = 'grid', 1000);
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
    };

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

    // Display the marker
    this._renderWorkoutMarker(workout);

    // Render the workout on the list
    this._renderWorkout(workout)

    // Clear the input form
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  };

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(L.popup({
        maxWidth: 250,
        minWidth: 100,
        autoClose: false,
        closeOnClick: false,
        className: `${workout.type}-popup`,
      }))
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚴'} ${workout.description}`
      )
      .openPopup();
    this.#popups.push(marker)

  };

  // Render workout on map as marker
  _renderWorkout(workout) {

    let html = `
      <li class="workout workout--${workout.type}" data-id='${workout.id}'>
        <h2 class="workout__title">${workout.description}
        <button type="button" class ="workout__delete">🗑️</button>
        </h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.type==='running'?'🏃‍':'🚴'}
            </span>
          <span class="workout__value  workout__value--distance
            workout__value--edit">
            ${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value  workout__value--time
            workout__value--edit">
            ${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
        `;

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
              <span class="workout__value">${workout.elevation}</span>
              <span class="workout__unit">m</span>
            </div>
          </li>
            `;

      form.insertAdjacentHTML('afterend', html);
      console.log(workout);

      document.querySelector('.workout__delete').addEventListener('click',
        this._deleteWorkout.bind(this));
  };

  _deleteWorkout(e) {
    e.stopPropagation()

    const workoutEl = e.target.closest('.workout');
    const id = workoutEl.getAttribute('data-id')
    let pos;

    // Find the index of the element to delete
    this.#workouts.forEach(function(workout, i) {
      if(workout.id === id) {
        pos = i;
      };
    });

    // Remove the popup from the map
    this.#map.removeLayer(this.#popups[pos]);
    this.#popups.splice(pos, 1);

    // Remove the workout from the workouts array,local storage and DOM
    workoutEl.remove();
    this.#workouts.splice(pos, 1);
    this._refreshLocalStorage()
  };

  _editField(e) {
    if (e.target.classList.contains('form__edit')) return;

    const field = e.target.closest('.workout__value--edit');
    if (!field) return;

    const html = `<input maxlength=3 width=100% type=number
      class="form__edit form__edit--${field.classList.contains('workout__value--time') ? 'time' : 'distance'}">
    `

    field.insertAdjacentHTML('afterbegin', html);
    const formEditEl = field.querySelector('.form__edit');

    formEditEl.focus();
    formEditEl.addEventListener('change', this._completeEdit.bind(this));
    formEditEl.addEventListener('blur', this._cancelEdit.bind(this));
  };

  _completeEdit(e) {
    e.stopPropagation()

    console.log(e.target.classList.contains('form__edit--time'));
    const newVal = e.target.value;
    const workoutEl = document.querySelector('.form__edit')
                      .closest('.workout');
    const workoutId = workoutEl.getAttribute('data-id');
    if (!workoutId) return;
    console.log(workoutEl);

    if (e.target.classList.contains('form__edit--time')) {
      console.log('time');
      this.#workouts.find(work => work.id === workoutId).duration = +newVal;
      workoutEl.querySelector('.workout__value--time').textContent = newVal;

    } else {
      console.log('distance');
      this.#workouts.find(work => work.id === workoutId)
        .distance = +newVal;
      workoutEl.querySelector('.workout__value--distance')
        .textContent = newVal;
    };

    if (document.querySelector('.form__edit'))
      document.querySelector('.form__edit').remove();
    this._refreshLocalStorage();
  };

  _cancelEdit(e) {
    // Js uses blur twice because it is set in an EH, if statement catches it
    if (e.relatedTarget) document.querySelector('.form__edit').remove();
  };

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if(!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1
      }
    });
  };

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  };

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;
    this._drawAllWorkouts()
  };

  _refreshLocalStorage() {
    console.log('refreshed');
    localStorage.removeItem('workouts');
    this._setLocalStorage();
  }

  _drawAllWorkouts() {
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
};

const app = new App();
