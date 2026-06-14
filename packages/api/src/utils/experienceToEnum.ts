type ExperienceInput = number | null | undefined;

export type ExperienceLevelName = 'BEGINNER' | 'INTERMEDIARY' | 'ADVANCED';

export const experienceToEnum = (experience: ExperienceInput): ExperienceLevelName => {
  switch (Number(experience)) {
    case 1:
      return 'INTERMEDIARY';
    case 2:
      return 'ADVANCED';
    default:
      return 'BEGINNER';
  }
};
