browser.runtime.sendMessage({}).then(message => {
  let parser = new DOMParser();
  let doc = parser.parseFromString(message, 'text/html');
  let elems = doc.querySelectorAll('script');
  for(let elem of elems) {
    elem.parentNode.removeChild(elem);
  }
  document.body.appendChild(doc.firstChild);
}, error => {});