const {JSDOM} = require('jsdom');
const moment = require('moment');
const chalk = require('chalk');
const ora = require('ora');
const spinners = require('cli-spinners');
const fs = require('fs');

const ErrorType = {
  FAIL_TO_READ: 'FAIL_TO_READ',
  FAIL_TO_WRITE: 'FAIL_TO_WRITE',
  FAIL_TO_PARSE: 'FAIL_TO_PARSE',
  FAIL_TO_FETCH: 'FAIL_TO_FETCH'
}

function createHandleError (spinner) {
  return function (errorType) {
    return new Promise((res, rej) => {
      spinner.stopAndPersist({
        symbol: chalk.red`⃠`,
        text: `Error ${errorType}`
      });
    });
  }
}

function fetch (spinner) {
  const handleError = createHandleError(spinner);
  spinner.text = 'Fetching data';

  return JSDOM
    .fromURL('https://lichess.org/@/zube')
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
        const newData = Object.keys(newEntries).filter(date => !Object.keys(data.entries).includes(date))

        const updatedData = {
          entries: {
            ...data.entries,
            ...newEntries
          }
        };

        if (newData.length > 0) {
          newData.forEach(rawDate => {
            const date = new Date(rawDate);
            console.log(`  ${chalk.green('↗')} New entry found for ${chalk.bold(moment(date).format('LL'))}`)
          });
        } else {
          console.log(`  ${chalk.yellow('∗')} No new entries found`)
        }

        spinner.text = 'Updating data file';
        fs.writeFile('./data.json', JSON.stringify(updatedData, null, 2), (err) => {
          if (err) {
            return handleError(ErrorType.FAIL_TO_WRITE);
          }
        });
      });
    })
    .catch((err) => {
      return handleError(ErrorType.FAIL_TO_FETCH);
    });
}

function main () {
  const spinner = ora({
    text: 'Warming up',
    color: 'white',
    spinner: {
      ...spinners.dots10,
      interval: 30
    }
  }).start();
  fetch(spinner).then(() => {
    spinner.stopAndPersist({
      symbol: chalk.green`✓`,
      text: `Success`
    });
  });
}

main();
