'use babel';

export default class PgDevView {

  constructor(serializedState) {
    // Create root element
    atom.notifications.addInfo('El mensaje de la notificaciones!!!!');

    
    this.element = document.createElement('div');
    this.element.classList.add('pg-dev');

    // Create message element
    const message = document.createElement('div');
    message.textContent = 'The PgDev package is Alive! It\'s ALIVE!';
    message.classList.add('message');
    this.element.appendChild(message);
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {}

  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

}
