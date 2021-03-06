'use strict';

class Workouts {
  // date = new Date();
  // id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration, date, id) {
    // this.date = ...
    // this.id = ...
    this.coords = coords; //[lat , lng]  array of latitude and longitude
    this.distance = distance; // in KM
    this.duration = duration; // in MIN
    if (!date) {
      this.date = new Date();
    } else {
      this.date = new Date(date);
    }
    if (!id) {
      this.id = (Date.now() + '').slice(-10);
    } else {
      this.id = id;
    }
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workouts {
  type = 'running';
  constructor(coords, distance, duration, cadence,date,id) {
    super(coords, distance, duration,date,id);
    this.cadence = cadence;
    // this.running = running
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workouts {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.cycling = cycling
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km/min
    this.speed = this.distance / (this.duration / 60);
    return this.calcSpeed;
  }
}

// const run1 = new Running([39, -12], 5.3, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 578);
// console.log(run1, cycling1);

//////////////////////////////////////////////
//    APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const resetBtn = document.querySelector('.reset_btn');

class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];
  #workoutsCoords = [];
  constructor() {
    // Get user's position..
    this._getPostion();

    // Get data from local storage
    this._getLocalStorage();

    // delete a workout activity
    // this._deleteActivity()

    // Attach event handlers
    form.addEventListener('submit', this._newWorkOut.bind(this));
    form.addEventListener('submit', this._submitWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._editWorkout.bind(this));
    resetBtn.addEventListener('click', this._removeAll.bind(this));
    // Btn.addEventListener('click', this._editActivity.bind(this));
  }

  _getPostion() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`could not get your location`);
        }
      );
  }

  _loadMap(position) {
    {
      const { latitude } = position.coords;
      const { longitude } = position.coords;
      console.log(`https://www.google.com/maps/@${latitude},${longitude},12z `);

      const coords = [latitude, longitude];
      this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
      //   console.log(map);

      L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(this.#map);

      //  Handling clicks on the map
      this.#map.on('click', this._showForm.bind(this));

      this.#workouts.forEach(work => {
        this._renderWorkoutMarker(work);
      });
    }
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _clearForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
  }

  _hideForm() {
    // Empty the inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkOut(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    e.preventDefault();

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //  if workout Running, create running object

    if (type === 'running') {
      const cadence = +inputCadence.value;
      // check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be postitve number');

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    //  if workout Cycling, create Cycling object

    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be postitve number');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // Add new object to workout array
    this.#workouts.push(workout);

    // console.log(this.#workouts);

    // Render workout on marker as map
    this._renderWorkoutMarker(workout);

    //  render lines on the map

    this._renderLine(workout);
    //  render workouts on the list
    this._renderWorkout(workout);

    //  Hide the form  + Clear the form
    this._hideForm();

    // set local storage to all workouts

    this._setLocalStorage();

    // Display the marker
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '?????????????' : '?????????????'} ${workout.description}`
      )

      .openPopup();
  }

  _renderLine(workout) {
    let circleOptions = {
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0,
      className:'boundary_line'
    };
    let circle = L.circle(workout.coords, 2000, circleOptions).addTo(this.#map);
    // L.polyLine(workout.coords, { color: 'red' }).addTo(this.#map);
    // this.#coordsArray = this.#coordsArray.push(this.#workouts.coords.value);
    // let Cir = L.polygon(workout.coords, { color: 'red' }).addTo(this.#map);
    this.#map.fitBounds(circle.getBounds());
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${
      workout.description
    } </h2>
        <div class="workout-icons-action">
          <span class="workout__icon edit__icon" data-id="${workout.id}">
          ????
          </span>
          <span class="workout__icon  delete__icon" data-id="${workout.id}">
          ???
          </span>

        </div>
       
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '?????????????' : '?????????????'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">???</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
          
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">??????</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">????????</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">??????</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">???</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      
      `;
    // let btn = `<div><button class="form__btn">edit</button></div>`;
    // form.insertAdjacentHTML('beforeend  ', btn);
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    if (!this.#map) return;
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    // using public interface
    // workout.click();
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
/////////////////////////////////////////////////////////////
  
  _deleteWorkout(e) {
    const deleteEl = e.target.closest('.delete__icon');
    // console.log('remove btn clicked');
    if (!deleteEl) return;
    //getting workout id
    const deleteWorkouts = this.#workouts.filter(
      work => work.id !== deleteEl.dataset.id
    );
    //removing localStorage
    localStorage.removeItem('workouts');

    this.#workouts = deleteWorkouts;
    //Updating Local Storage
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    //Deleting All Elements
    this._resetElement();
    //rendering remaining elements
    this._updateWorkouts(deleteWorkouts);
  }
  _editWorkout(e) {
    const editEl = e.target.closest('.edit__icon');
    if (!editEl) return;
    const workoutData = this.#workouts.find(
      work => work.id === editEl.dataset.id
    );

    this.workoutId = workoutData.id;

    inputType.value = workoutData.type;
    inputDistance.value = workoutData.distance;
    inputDuration.value = workoutData.duration;
    if (workoutData.type === 'running') {
      inputElevation.closest('.form__row').classList.add('form__row--hidden');
      inputCadence.closest('.form__row').classList.remove('form__row--hidden');
      inputCadence.value = workoutData.cadence;
    }
    if (workoutData.type === 'cycling') {
      inputCadence.closest('.form__row').classList.add('form__row--hidden');
      inputElevation
        .closest('.form__row')
        .classList.remove('form__row--hidden');
      inputElevation.value = workoutData.elevation;
    }

    if (editEl) {
      this._showForm();
    }
    inputType.setAttribute('disabled', 'true');
  }
  _submitWorkout(e) {
    e.preventDefault();
    if (!this.workoutId) return;
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    const id = this.workoutId;
    const editworkouts = this.#workouts.find(work => work.id === id);
    if (!inputDistance.value) {
      return;
    }
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    if (editworkouts.type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Inputs have to be positive numbers');
      }
      editworkouts.distance = distance;
      editworkouts.duration = duration;
      editworkouts.cadence = cadence;
      function calcPace(duration, distance) {
        // min/km
        const pace = duration / distance;
        return pace;
      }
      editworkouts.pace = calcPace(duration, distance);
    }
    if (editworkouts.type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration, elevation)
      ) {
        return alert('Inputs have to be positive numbers');
      }
      editworkouts.distance = distance;
      editworkouts.duration = duration;
      editworkouts.elevation = elevation;
      function calcSpeed(distance, duration) {
        // km/hr
        const speed = distance / duration / 60;
        return speed;
      }
      editworkouts.speed = calcSpeed(distance, duration);
    }

    localStorage.removeItem('workouts');
    this._setLocalStorage();
    this._resetElement();
    this._updateWorkouts(this.#workouts);
    this._hideForm();
    this.workoutId = undefined;
  }
  //Reseting Elements
  _resetElement() {
    const restoredEl = document.querySelectorAll('.workout');
    const restoredPopup = document.querySelectorAll('.leaflet-popup');
    const restoredMarker = document.querySelectorAll('.leaflet-marker-icon');
    const restoredShadow = document.querySelectorAll('.leaflet-marker-shadow');
    const restoredBoundary = document.querySelectorAll('.boundary_line');

    restoredEl.forEach(ele => {
      ele.remove();
    });
    restoredBoundary.forEach(ele=>{
      ele.remove();
    })
    restoredPopup.forEach(pop => {
      pop.remove();
    });
    restoredMarker.forEach(marker => {
      marker.remove();
    });
    restoredShadow.forEach(shadow => {
      shadow.remove();
    });
  }
  //Repopulating Workouts
  _updateWorkouts(workout) {
    workout.forEach(workout => {
      this._renderWorkout(workout);
      this._renderWorkoutMarker(workout);
    });
  }

  _removeAll() {
    if (window.confirm('Do you really want to reset all your Workouts!????')) {
      this._reset();
    }
  }
  // ///////////////////////////////////////////////////////////////

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
