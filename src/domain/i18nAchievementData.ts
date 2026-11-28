import type { AchievementId } from './types';

export interface ILocalizedTitleDesc {
  readonly title: string;
  readonly description: string;
}

export const ACHIEVEMENT_EN: Record<AchievementId, ILocalizedTitleDesc> = {
  punctual_clockwork: {
    title: 'Swiss Precision',
    description: 'Finish a Duty run with average timetable deviation under 5 seconds.',
  },
  flawless_duty: {
    title: 'Flawless Duty',
    description: 'Complete a Duty run with Grade S and zero violations.',
  },
  classic_driver: {
    title: 'Classic Legend',
    description: 'Complete a full run operating the classic Seria 81 train.',
  },
  m2_master: {
    title: 'Line M2 Master',
    description: 'Complete a full run on Warsaw Metro Line M2.',
  },
  night_owl: {
    title: 'Night Owl',
    description: 'Complete a late-evening run starting at 23:30.',
  },
  nerves_of_steel: {
    title: 'Nerves of Steel',
    description: 'Acknowledge Czuwak 3+ times and resolve a door fault in one run.',
  },
  first_station_stop: {
    title: 'First Platform',
    description: 'Stop cleanly in the stop zone and complete passenger boarding.',
  },
  precision_stop: {
    title: 'Centimeter Precision',
    description: 'Stop within 2 meters of the platform STOP marker.',
  },
  passenger_carrier: {
    title: 'Rush Hour Carrier',
    description: 'Carry at least 100 passengers in a single run.',
  },
  challenge_inverter_fault: {
    title: 'Master of 60% Power',
    description: 'Complete the "Inverter Failure" challenge within 15s average delay.',
  },
  challenge_technical_run: {
    title: 'Technical Transfer',
    description: 'Complete the "Technical Non-Stop Run" without exceeding 40 km/h at platforms.',
  },
  challenge_black_series: {
    title: 'Black Series Survivor',
    description: 'Finish the "Black Series" challenge without SPAD or Czuwak violations.',
  },
  academy_license: {
    title: 'Train Driver License',
    description: 'Complete all 5 steps of the Driver Academy interactive tutorial.',
  },
  night_inspector: {
    title: 'Night Inspector',
    description:
      'Complete a Night Service (02:30) inspection run flawlessly (all crews ≤ 20 km/h + horn, 0 violations).',
  },
};
