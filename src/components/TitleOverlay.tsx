import { getRankProgress } from '../domain/driverProfile';
import type {
  ChallengeId,
  GameModeId,
  ICustomLineDraft,
  IDriverProfileStats,
  IGamepadStatus,
  ILeaderboardEntry,
  IMetroLineSpec,
  MetroLineId,
  RouteDirection,
  TimeOfDayId,
  TrainLiveryId,
  TrainModelId,
  WeatherModeId,
} from '../domain/types';
import { ConditionsAndModeSection } from './title/ConditionsAndModeSection';
import { LineAndVariantSection } from './title/LineAndVariantSection';
import { TitleHeaderBar } from './title/TitleHeaderBar';
import { TitleFooter, TitleSidebar } from './title/TitleSidebarAndFooter';
import { TrainAndLiverySection } from './title/TrainAndLiverySection';

interface ITitleOverlayProps {
  readonly activeLine: IMetroLineSpec;
  readonly baseLineSpec: IMetroLineSpec;
  readonly routeDirection: RouteDirection;
  readonly startStationIndex: number;
  readonly customLines: readonly ICustomLineDraft[];
  readonly driverProfile: IDriverProfileStats;
  readonly gamepadStatus: IGamepadStatus;
  readonly selectedModelId: TrainModelId;
  readonly selectedLiveryId: TrainLiveryId;
  readonly selectedTimeOfDayId: TimeOfDayId;
  readonly selectedWeatherMode: WeatherModeId;
  readonly selectedGameMode: GameModeId;
  readonly selectedChallengeId: ChallengeId;
  readonly leaderboard: readonly ILeaderboardEntry[];
  readonly achievementsUnlocked: number;
  readonly achievementsTotal: number;
  readonly onSelectLine: (lineId: MetroLineId) => void;
  readonly onSelectRouteDirection: (direction: RouteDirection) => void;
  readonly onSelectStartStation: (startIndex: number) => void;
  readonly onOpenLineBuilder: () => void;
  readonly onEditCustomLine: (draft: ICustomLineDraft) => void;
  readonly onDeleteCustomLine: (id: string) => void;
  readonly onSelectModel: (modelId: TrainModelId) => void;
  readonly onSelectLivery: (liveryId: TrainLiveryId) => void;
  readonly onSelectTimeOfDay: (timeOfDayId: TimeOfDayId) => void;
  readonly onSelectWeatherMode: (mode: WeatherModeId) => void;
  readonly onSelectGameMode: (mode: GameModeId) => void;
  readonly onSelectChallenge: (challengeId: ChallengeId) => void;
  readonly onOpenProfile: () => void;
  readonly onOpenAchievements: () => void;
  readonly onOpenSettings: () => void;
  readonly onToggleHelp: () => void;
  readonly onStartAcademy: () => void;
  readonly onStartPassengerAto: () => void;
  readonly onStart: () => void;
}

export function TitleOverlay(props: ITitleOverlayProps) {
  const rankProgress = getRankProgress(props.driverProfile.xp);
  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 md:p-5 bg-gradient-to-r from-[#06090f]/94 via-[#06090f]/78 to-[#06090f]/45 overflow-y-auto">
      <div className="w-full max-w-6xl mx-auto my-auto pointer-events-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-5 items-start">
        <div className="min-w-0">
          <TitleHeaderBar activeLine={props.activeLine} achievementsUnlocked={props.achievementsUnlocked} achievementsTotal={props.achievementsTotal} onOpenProfile={props.onOpenProfile} onOpenSettings={props.onOpenSettings} onOpenAchievements={props.onOpenAchievements} onToggleHelp={props.onToggleHelp} />
          <LineAndVariantSection activeLine={props.activeLine} baseLineSpec={props.baseLineSpec} routeDirection={props.routeDirection} startStationIndex={props.startStationIndex} customLines={props.customLines} onSelectLine={props.onSelectLine} onSelectRouteDirection={props.onSelectRouteDirection} onSelectStartStation={props.onSelectStartStation} onOpenLineBuilder={props.onOpenLineBuilder} onEditCustomLine={props.onEditCustomLine} onDeleteCustomLine={props.onDeleteCustomLine} />
          <TrainAndLiverySection selectedModelId={props.selectedModelId} selectedLiveryId={props.selectedLiveryId} currentRankId={rankProgress.currentRank.id} selectedGameMode={props.selectedGameMode} onSelectModel={props.onSelectModel} onSelectLivery={props.onSelectLivery} />
          <ConditionsAndModeSection activeLine={props.activeLine} selectedTimeOfDayId={props.selectedTimeOfDayId} selectedWeatherMode={props.selectedWeatherMode} selectedGameMode={props.selectedGameMode} selectedChallengeId={props.selectedChallengeId} onSelectTimeOfDay={props.onSelectTimeOfDay} onSelectWeatherMode={props.onSelectWeatherMode} onSelectGameMode={props.onSelectGameMode} onSelectChallenge={props.onSelectChallenge} onStart={props.onStart} onStartPassengerAto={props.onStartPassengerAto} onStartAcademy={props.onStartAcademy} />
        </div>
        <TitleSidebar driverProfile={props.driverProfile} leaderboard={props.leaderboard} onOpenProfile={props.onOpenProfile} />
      </div>
      <TitleFooter gamepadStatus={props.gamepadStatus} />
    </div>
  );
}
