import './style.css';
import { CollectionScreen } from './screens/CollectionScreen.ts';
import { QuestScreen } from './screens/QuestScreen.ts';
import { LootScreen } from './screens/LootScreen.ts';
import type { ScreenName } from './types.ts';

function navigate(screen: ScreenName): void {
  collectionScreen.hide();
  questScreen.hide();
  lootScreen.hide();

  switch (screen) {
    case 'collection': collectionScreen.show(); break;
    case 'quest':      questScreen.show(); break;
    case 'loot':       lootScreen.show(); break;
  }
}

const collectionScreen = new CollectionScreen(navigate);
const questScreen = new QuestScreen(navigate);
const lootScreen = new LootScreen(navigate);

navigate('collection');
