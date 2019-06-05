const {JSDOM} = require('jsdom');
const moment = require('moment');
const ora = require('ora');
const fs = require('fs');

const ErrorType = {
  FAIL_TO_READ: 1,
  FAIL_TO_WRITE: 2,
  FAIL_TO_PARSE: 3
}

function createHandleError (spinner) {
  return function (errorType) {
    return new Promise((res, rej) => {
      spinner.text = 'Error!';
      spinner.fail();
    });
  }
}

function fetch (spinner) {
  const handleError = createHandleError(spinner);
  spinner.text = 'Fetching Lichess data';

  return JSDOM
    .fromURL('https://lichess.org/')
    .then(dom => {
      spinner.text = 'Parsing Lichess data';
      const document = dom.window.document;
      const ratings = document.querySelectorAll('rating');
      const newEntries = {};
      ratings.forEach(node => {
        const parent = node.parentElement;
        if (parent.innerHTML.includes('tactical puzzles')) {
          try {
            const amount = parseInt(parent.textContent.match(/\d+/)[0], 10);
            const score = parseInt(node.childNodes[0].textContent, 10);
            const date = moment(
              parent
                .parentElement
                .parentElement
                .parentElement
                .childNodes[0]
                .childNodes[0]
                .getAttribute('datetime')
            );
            if (date.isValid() && !isNaN(amount) && !isNaN(score)) {
              newEntries[date.format('L')] = {amount, score};
            }
          } catch (e) {
            return handleError(ErrorType.FAIL_TO_PARSE);
          }
        }
      });

      if (Object.keys(newEntries).length === 0) {
        return handleError(ErrorType.FAIL_TO_PARSE);
      }

      spinner.text = 'Opening data file';
      return fs.readFile('./data.json', (err, json) => {
        if (err) {
          return handleError(ErrorType.FAIL_TO_READ);
        }
        const data = JSON.parse(json);
        const updatedData = {
          entries: {
            ...data.entries,
            ...newEntries
          }
        };

        spinner.text = 'Updating data file';
        fs.writeFile('./data.json', JSON.stringify(updatedData, null, 2), (err) => {
          if (err) {
            return handleError(ErrorType.FAIL_TO_WRITE);
          }
        });
      });
    });
}

function main () {
  const spinner = ora({
    text: 'Warming up',
    spinner: {
      interval: 70,
      frames: ['◜', '◝', '◟', '◞']
    }
  }).start();
  fetch(spinner).then(() => {
    spinner.text = 'Done!';
    spinner.succeed();
  });
}

main();
