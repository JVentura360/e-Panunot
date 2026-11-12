import { useState } from 'react';
import Tutorial from './Tutorial.jsx';
import { markTutorialSeen, shouldShowTutorial, tutorialRole } from './tutorialSeen.js';

export default function TutorialGate({ user }) {
  const [open, setOpen] = useState(() => shouldShowTutorial(window.localStorage, user));
  const role = tutorialRole(user);
  if (!open || !role) return null;

  const done = () => {
    markTutorialSeen(window.localStorage, user);
    setOpen(false);
  };

  return <Tutorial role={role} onDone={done} />;
}