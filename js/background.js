let defaultPreference = {
  contextMenuAction: 0,
  version: 1
};
let preferences = {};
let menuId = null;
let _token = '';
let _result = {};

const storageChangeHandler = (changes, area) => {
  if(area === 'local') {
    let changedItems = Object.keys(changes);
    for (let item of changedItems) {
      preferences[item] = changes[item].newValue;
    }
  }
};

const loadPreference = () => {
  browser.storage.local.get().then(results => {
    if ((typeof results.length === 'number') && (results.length > 0)) {
    results = results[0];
    }
    if (!results.version) {
      preferences = defaultPreference;
      browser.storage.local.set(defaultPreference).then(res => {
        browser.storage.onChanged.addListener(storageChangeHandler);
      }, err => {
      });
    } else {
      preferences = results;
      browser.storage.onChanged.addListener(storageChangeHandler);
    }
    browser.storage.local.set({cacheText: ''});
    if (preferences.version !== defaultPreference.version) {
      let update = {};
      let needUpdate = false;
      for(let p in defaultPreference) {
        if(preferences[p] === undefined) {
          update[p] = defaultPreference[p];
          needUpdate = true;
        }
      }
      if(needUpdate) {
        update.version = defaultPreference.version;
        browser.storage.local.set(update).then(null, err => {});
      }
    }
    // resetContextMenu();
    // setBrowserActionIcon();
  });
};

window.addEventListener('DOMContentLoaded', event => {
  loadPreference();
});

// function addReferer(e){
//   e.requestHeaders.push({name:'Referer', value:'https://boshiamy.com/liuquery.php'});
//   return {requestHeaders: e.requestHeaders};
// }

const createContextMenu = () => {
  menuId = browser.contextMenus.create({
    type: 'normal',
    title: browser.i18n.getMessage('queryBoshiamy'),
    contexts: ['selection'],
    onclick: (data, tab) => {
      let text = data.selectionText;
      getToken(token => {
        liuquery(text, token, preferences.contextMenuAction === 0 ? 'table' : 'array', data => {
          //console.log(array.join(','));
          if(preferences.contextMenuAction === 0) {
            chrome.tabs.create({url:'./queryResult.html'}, tab => {
              _result[tab.id] = data;
            });
          }
          else {
            chrome.tabs.executeScript({
              code: `alert('${JSON.parse(JSON.stringify(data.join(', ')))}')`
            });
          }
        });
      });
      //
    }
  });
};

const liuquery = (c, token, dataType, cb) => {
  // browser.webRequest.onBeforeSendHeaders.addListener(
  //   addReferer,
  //   {urls: ['https://boshiamy.com/liuquery.php']},
  //   ['blocking', 'requestHeaders']
  // );
  let req = new XMLHttpRequest();
  req.onload = function(e) {
    //browser.webRequest.onBeforeSendHeaders.removeListener(addReferer);
    //console.log(req.responseText);
    let result = [];
    let text = req.responseText;
    text = text.replace(/\r\n/g,'\n').replace(/\n/g,'');
    let table = text.match(/<table.*<\/table>/ig);
    if(table) {
      if(dataType === 'array') {
        let parser = new DOMParser();
        let doc = parser.parseFromString(table[0], 'text/html');
        let characters = (doc.querySelectorAll('tr'));
        for(let c of characters) {
          let s = c.firstChild.textContent;
          let elems = (c.querySelectorAll('span.rootmean'));
          for(let e of elems) {
            if(e.textContent === '(建議碼)') {
              s+='('+e.parentNode.firstChild.textContent+')';
              result.push(s);
              break;
            }
          }
        }
        cb(result);
      }
      else if(dataType === 'table') {
        cb(table);
      }
    }
  }
  req.onerror = function(e) {
  }
  req.open('POST', 'https://boshiamy.com/liuquery.php');
  req.setRequestHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
  req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  req.setRequestHeader('Upgrade-Insecure-Requests', '1');
  req.send('f=1&q='+c+'&token='+token);
};

const getToken = (cb) => {
  if(!_token) {
    let req = new XMLHttpRequest();
    req.onload = function(e) {
      //console.log(req.responseText);
      let text = req.responseText;
      text = text.replace(/\r\n/g,'\n').replace(/\n/g,'');
      let form = text.match(/<form.*<\/form>/ig);
      if(form) {
        let parser = new DOMParser();
        let doc = parser.parseFromString(form[0], 'text/html');
        let tokenElem = (doc.querySelector('input[type="hidden"][name="token"]'));
        let token = tokenElem.getAttribute('value');
        _token = token;
        cb(token);
      }
    }
    req.onerror = function(e) {
    }
    req.open('GET', 'https://boshiamy.com/liuquery.php');
    // req.setRequestHeader('Content-Type', 'application/json');
    // req.send(JSON.stringify({longUrl: long_url}));
    req.send();
  }
  else {
    cb(_token);
  }
};

createContextMenu();

browser.runtime.onMessage.addListener( (request, sender, sendResponse) => {
  sendResponse(_result[sender.tab.id]);
  if(_result[sender.tab.id])
    delete _result[sender.tab.id];
});
