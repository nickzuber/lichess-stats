const {JSDOM} = require('jsdom');
const moment = require('moment');

const dom = JSDOM
  .fromURL('https://lichess.org/@/zube')
  .then(dom => {
    const document = dom.window.document;
    const ratings = document.querySelectorAll('rating');
    const data = [];
    ratings.forEach(node => {
      const parent = node.parentElement;
      if (parent.innerHTML.includes('tactical puzzles')) {
        const amount = parent.textContent.match(/\d+/)[0];
        const score = node.childNodes[0].textContent;

        const date = moment(
          parent
            .parentElement
            .parentElement
            .parentElement
            .childNodes[0]
            .childNodes[0]
            .getAttribute('datetime')
        );

        console.warn(date.format('L'), amount, score)
      }
    });
  });
