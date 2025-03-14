@echo off
cd /d %~dp0
set NODE_ENV=test
echo Running server tests...
npm test -- tests/server.test.js --forceExit
echo.
echo Running poller tests...
npm test -- tests/answer_poller.test.js
echo.
echo All tests completed! 