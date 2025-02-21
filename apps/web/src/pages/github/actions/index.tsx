import { bindServices } from '@rabjs/react';
import { ActionsPage } from './actions';
import { ActionsService } from './actions.service';

const ActionsPageWithServices = bindServices(ActionsPage, [ActionsService]);
export default ActionsPageWithServices;