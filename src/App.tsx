import { useRef } from 'react';
import { ModalsAndToastsLayer } from './components/app/ModalsAndToastsLayer';
import { PlayingHudLayer } from './components/app/PlayingHudLayer';
import { buildRootTelemetryAttributes } from './components/app/rootTelemetryAttrs';
import { FpsCounterBadge } from './components/FpsCounterBadge';
import { PortraitHintBanner } from './components/PortraitHintBanner';
import { TitleOverlay } from './components/TitleOverlay';
import { getPhotoFilterSpec } from './domain/photoMode';
import { useMetroGame, type IMetroGameController } from './hooks/useMetroGame';
import { LanguageProvider } from './i18n/LanguageContext';

function TitleScreenLayer({ game }: { readonly game: IMetroGameController }) {
  const { snapshot } = game;
  if (snapshot.phase !== 'title') return null;
  return (
    <TitleOverlay
      activeLine={snapshot.line} baseLineSpec={game.baseLineSpec} routeDirection={game.routeDirection} startStationIndex={game.startStationIndex}
      depotHallStart={snapshot.depotZone.depotHallStartEnabled} trainspottingSpotIndex={snapshot.trainspotting.spotIndex}
      customLines={game.customLines} driverProfile={game.driverProfile} gamepadStatus={game.gamepadStatus}
      selectedModelId={snapshot.trainModel.id} selectedLiveryId={game.selectedLiveryId} selectedTimeOfDayId={snapshot.timeOfDay.id}
      selectedWeatherMode={snapshot.weather.mode} selectedGameMode={snapshot.gameMode} selectedChallengeId={snapshot.challenge?.id ?? 'inverter_fault'}
      leaderboard={game.leaderboard} achievementsUnlocked={game.unlockedAchievements.length} achievementsTotal={game.achievementCatalog.length}
      onSelectLine={game.selectMetroLine} onSelectRouteDirection={game.selectRouteDirection} onSelectStartStation={game.selectStartStation}
      onToggleDepotHallStart={game.setDepotHallStart} onSelectTrainspottingSpot={game.selectTrainspottingSpot}
      onOpenLineBuilder={() => game.openLineBuilder()} onEditCustomLine={(draft) => game.openLineBuilder(draft)} onDeleteCustomLine={game.deleteCustomLine}
      onSelectModel={game.selectTrainModel} onSelectLivery={game.selectTrainLivery} onSelectTimeOfDay={game.selectTimeOfDay}
      onSelectWeatherMode={game.selectWeatherMode} onSelectGameMode={game.selectGameMode} onSelectChallenge={game.selectChallenge}
      onOpenProfile={game.openProfile} onOpenAchievements={game.openAchievements} onOpenSettings={game.openSettings} onToggleHelp={game.toggleHelp}
      onStartAcademy={game.startAcademy} onStartPassengerAto={game.startPassengerAto} onStart={game.startGame}
    />
  );
}

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const game = useMetroGame(mountRef);
  const canvasStyle = game.photoModeActive ? { filter: getPhotoFilterSpec(game.photoState.filter).cssFilter } : undefined;
  return (
    <LanguageProvider language={game.settings.language} onSetLanguage={game.setLanguage}>
      <main className="relative w-full h-full overflow-hidden bg-[#06080d]" data-testid="metro-simulator-root" {...buildRootTelemetryAttributes(game)}>
        <div ref={mountRef} data-testid="three-canvas-mount" className="absolute inset-0 w-full h-full" style={canvasStyle} />
        {game.settings.showFps && !game.photoModeActive && <FpsCounterBadge fps={game.fps} quality={game.settings.graphicsQuality} />}
        <TitleScreenLayer game={game} />
        {game.showPortraitHint && !game.photoModeActive && <PortraitHintBanner onDismiss={game.dismissPortraitHint} />}
        <PlayingHudLayer game={game} />
        <ModalsAndToastsLayer game={game} />
      </main>
    </LanguageProvider>
  );
}
