(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getReleaseNotes = () => {
    const uri = 'https://raw.githubusercontent.com/equinusocio/vsc-material-theme-releases/master/releases/index.json';
    return fetch(uri).then(res => res.json());
};
const renderTemplate = (posts) => {
    return `${posts.reduce((acc, { version, title, fixed, new: newItems, breaking }) => acc.concat(`<section class="Release">
    <header class="Release__Header">
      <span class="Release__Number">${version}</span>
      <h2 class="Release__Title">${title}</h2>
    </header>
    <ul class="Release-List">
      ${fixed.reduce((accc, src) => accc.concat(`<li data-type="fixed">${src}</li>`), '')}
      ${newItems.reduce((accc, src) => accc.concat(`<li data-type="new">${src}</li>`), '')}
      ${breaking.reduce((accc, src) => accc.concat(`<li data-type="breaking">${src}</li>`), '')}
    </ul>
  </section>`), '')}`;
};
getReleaseNotes().then((res) => {
    document.querySelector('.Container').innerHTML = renderTemplate(res);
});

},{}]},{},[1]);
