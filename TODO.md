TODO: Fix bug where Energy doesn't increase when sleeping. It's only decreasing.
FEATURE: Show state below Stage and Age if it's Asleep or Awake.
FEATURE: If Tomagatchi has 0 Energy, It's state will show "Tired"
--
Baby (0-24 hours): Sleeps for about 5 minutes after hatching. 
Child (24-72 hours): Sleeps from 8 PM to 9 AM. 
Teen (72-96 hours): Sleeps from 9 PM to 9 AM. 
Adult (96+ hours): Sleeps from 10 PM to 9 AM.

TODO:Error when accessing Old Pet:
Get pet error: TypeError: Assignment to constant variable.
    at Tamagotchi.calculatePassiveDegradation (/Users/adamhageman/GitHub/Demos/DemoProject/models/Tamagotchi.js:90:15)
    at /Users/adamhageman/GitHub/Demos/DemoProject/routes/pet.js:17:43
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)