import test from 'ava';
import delay from 'delay';
import moment from 'moment-timezone';
import {beforeEach, afterEach, startAgenda} from '../helpers';

test.beforeEach(beforeEach);
test.afterEach.always(afterEach);

// eslint-disable-next-line ava/no-skip-test
test.skip.cb('runs a recurring job after a lock has expired', t => {
  const {agenda} = t.context;
  let startCounter = 0;

  agenda.define('lock job', {
    lockLifetime: 50
  }, () => {
    startCounter++;

    if (startCounter !== 1) {
      t.is(startCounter, 2);
      agenda.stop(t.end);
    }
  });

  t.is(agenda._definitions['lock job'].lockLifetime, 50);

  agenda.defaultConcurrency(100);
  agenda.processEvery(10);
  agenda.every('0.02 seconds', 'lock job');

  agenda.stop(() => {
    agenda.start();
  });
});

// eslint-disable-next-line ava/no-skip-test
test.skip.cb('runs a one-time job after test.skips lock expires', t => {
  const {agenda} = t.context;
  let runCount = 0;

  agenda.define('lock job', {
    lockLifetime: 50
  }, (job, cb) => { // eslint-disable-line no-unused-vars
    runCount++;

    if (runCount !== 1) {
      t.is(runCount, 2);
      agenda.stop(t.end);
    }
  });

  agenda.processEvery(50);
  agenda.start();
  agenda.now('lock job', {
    i: 1
  });
});

// eslint-disable-next-line ava/no-skip-test
test.skip('does not process locked jobs', async t => {
  const {agenda} = t.context;
  const history = [];

  agenda.define('lock job', {
    lockLifetime: 300
  }, (job, done) => {
    history.push(job.attrs.data.i);

    setTimeout(() => {
      done();
    }, 150);
  });

  await startAgenda(agenda);

  agenda.now('lock job', {i: 1});
  agenda.now('lock job', {i: 2});
  agenda.now('lock job', {i: 3});

  await delay(500);

  t.is(history.length, 3);
  t.true(history.includes(1));
  t.true(history.includes(2));
  t.true(history.includes(3));
});

// eslint-disable-next-line ava/no-skip-test
test.skip('does not on-the-fly lock more than agenda._lockLimit jobs', async t => {
  const {agenda} = t.context;
  agenda.lockLimit(1);
  agenda.define('lock job', (job, cb) => {}); // eslint-disable-line no-unused-vars

  await startAgenda(agenda);

  agenda.now('lock job', {i: 1});
  agenda.now('lock job', {i: 2});

  await delay(500);

  t.is(agenda._lockedJobs.length, 1);
});

// eslint-disable-next-line ava/no-skip-test
test.skip.cb('does not on-the-fly lock more than definition.lockLimit jobs', t => {
  const {agenda} = t.context;
  agenda.define('lock job', {lockLimit: 1}, (job, cb) => {}); // eslint-disable-line no-unused-vars

  agenda.start();

  setTimeout(() => {
    agenda.now('lock job', {i: 1});
    agenda.now('lock job', {i: 2});

    setTimeout(() => {
      t.is(agenda._lockedJobs.length, 1);
      agenda.stop(t.end);
    }, 500);
  }, 500);
});

// eslint-disable-next-line ava/no-skip-test
test.skip.cb('does not lock more than agenda._lockLimit jobs during processing interval', t => {
  const {agenda} = t.context;
  agenda.lockLimit(1);
  agenda.processEvery(200);

  agenda.define('lock job', (job, cb) => {}); // eslint-disable-line no-unused-vars

  agenda.start();

  const when = moment().add(300, 'ms').toDate();

  agenda.schedule(when, 'lock job', {i: 1});
  agenda.schedule(when, 'lock job', {i: 2});

  setTimeout(() => {
    t.is(agenda._lockedJobs.length, 1);
    agenda.stop(t.end);
  }, 500);
});

// eslint-disable-next-line ava/no-skip-test
test.skip.cb('does not lock more than definition.lockLimit jobs during processing interval', t => {
  const {agenda} = t.context;
  agenda.processEvery(200);

  agenda.define('lock job', {lockLimit: 1}, (job, cb) => {}); // eslint-disable-line no-unused-vars

  agenda.start();

  const when = moment().add(300, 'ms').toDate();

  agenda.schedule(when, 'lock job', {i: 1});
  agenda.schedule(when, 'lock job', {i: 2});

  setTimeout(() => {
    t.is(agenda._lockedJobs.length, 1);
    agenda.stop(t.end);
  }, 500);
});
