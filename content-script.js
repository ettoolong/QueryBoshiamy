browser.runtime.onMessage.addListener( message => {
  if(message.action === 'showAlert') {
    alert(message.data.join(', '));
  }
  else {
    let text = window.getSelection().toString();
    text = text.replace(/^\s+|\s+$/g,'').replace(/\r\n/g,'\n').replace(/\n/g,'');
    if(text) {
      return Promise.resolve({text: text});
    }
    else {
      return Promise.resolve({text: ''});
    }
  }
});
