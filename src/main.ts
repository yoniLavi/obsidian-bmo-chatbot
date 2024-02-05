import { Plugin, TFile } from 'obsidian';
import { BMOView, VIEW_TYPE_CHATBOT} from "./view";
import { BMOSettingTab } from './settings';
import { promptSelectGenerateCommand, renameTitleCommand } from './components/editor/EditorCommands';

export interface BMOSettings {
	apiKey: string;
	max_tokens: string;
	model: string;
	system_role: string;
	temperature: number;
	userName: string;
	chatbotName: string;
	chatbotContainerBackgroundColor: string;
	userMessageBackgroundColor: string;
	botMessageBackgroundColor: string;
	chatHistoryPath: string;
	templateFilePath: string;
	promptFolderPath: string;
	prompt: string;
	system_role_prompt_select_generate: string;
	openAIBaseUrl: string;
	ollamaRestAPIUrl: string;
	allowOllamaStream: boolean;
	openAIRestAPIUrl: string;
	allowOpenAIRestAPIStream: boolean;
	allowReferenceCurrentNote: boolean;
	allowRenameNoteTitle: boolean;
	allModels: string[];
	ollamaModels: string[];
	openAIRestAPIModels: string[];
	openAIBaseModels: string[];
	allowHeader: boolean;
	toggleGeneralSettings: boolean;
	toggleAppearanceSettings: boolean;
	toggleEditorSettings: boolean;
	toggleChatHistorySettings: boolean;
	togglePromptSettings: boolean;
	toggleAPIConnectionSettings: boolean;
	toggleOpenAIRestAPIUrlSettings: boolean;
	toggleOllamaSettings: boolean;
	toggleAdvancedSettings: boolean;
	ollamaParameters: {
		mirostat: string;
		mirostat_eta: string;
		mirostat_tau: string;
		num_ctx: string;
		num_gqa: string;
		num_thread: string;
		repeat_last_n: string;
		repeat_penalty: string;
		seed: string;
		stop: string[];
		tfs_z: string;
		top_k: string;
		top_p: string;
		keep_alive: string;
	},
}

export const DEFAULT_SETTINGS: BMOSettings = {
	apiKey: '',
	max_tokens: '',
	model: '',
	system_role: 'You are a helpful assistant.',
	temperature: 1.00,
	userName: 'USER',
	chatbotName: 'BMO',
	chatbotContainerBackgroundColor: '--background-secondary',
	userMessageBackgroundColor: '--background-primary',
	botMessageBackgroundColor: '--background-secondary',
	chatHistoryPath: 'BMO/',
	templateFilePath: '',
	promptFolderPath: '',
	prompt: '',
	system_role_prompt_select_generate: 'You are a helpful assistant who responds in markdown.',
	openAIBaseUrl: 'https://api.openai.com/v1',
	ollamaRestAPIUrl: '',
	allowOllamaStream: false,
	openAIRestAPIUrl: '',
	allowOpenAIRestAPIStream: false,
	allowReferenceCurrentNote: false,
	allowRenameNoteTitle: false,
	allModels: [],
	ollamaModels: [],
	openAIRestAPIModels: [],
	openAIBaseModels: [],
	allowHeader: true,
	toggleGeneralSettings: true,
	toggleAppearanceSettings: false,
	toggleEditorSettings: false,
	toggleChatHistorySettings: false,
	togglePromptSettings: false,
	toggleAPIConnectionSettings: true,
	toggleOpenAIRestAPIUrlSettings: true,
	toggleOllamaSettings: true,
	toggleAdvancedSettings: false,
	ollamaParameters: {
		keep_alive: '',
		mirostat: '0',
		mirostat_eta: '0.1',
		mirostat_tau: '5.0',
		num_ctx: '2048',
		num_gqa: '',
		num_thread: '',
		repeat_last_n: '64',
		repeat_penalty: '1.1',
		seed: '',
		stop: [],
		tfs_z: '1.0',
		top_k: '40',
		top_p: '0.9',
	},
}

export let checkActiveFile: TFile | null = null;

export default class BMOGPT extends Plugin {
	settings: BMOSettings;

	async onload() {
		await this.loadSettings();

        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                this.handleFileSwitch();
            })
        );

		this.registerView(
			VIEW_TYPE_CHATBOT,
			(leaf) => new BMOView(leaf, this.settings, this)
		);

		this.addRibbonIcon("bot", "BMO Chatbot", () => {
			this.activateView();
		});

		this.addCommand({
            id: 'open-bmo-chatbot',
            name: 'Open BMO Chatbot',
            callback: () => {
                this.activateView();
            },
            hotkeys: [
				{
					modifiers: ['Mod'],
					key: '0',
				},
            ],
        });

		this.addCommand({
            id: 'rename-note-title',
            name: 'Rename Note Title',
            callback: () => {
				renameTitleCommand(this.settings);
            },
            hotkeys: [
				{
					modifiers: ['Mod'],
					key: '\'',
				},
            ],
        });

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (!(file instanceof TFile)) {
					return;
				}
	
				menu.addItem((item) => {
					item
						.setTitle('BMO Chatbot: Generate new title')
						.onClick(() => renameTitleCommand(this.settings));
				});
			})
		);

		this.addCommand({
            id: 'prompt-select-generate',
            name: 'Prompt Select Generate',
            callback: () => {
				promptSelectGenerateCommand(this.settings);
            },
            hotkeys: [
				{
					modifiers: ['Mod'],
					key: '=',
				},
            ],
        });

		this.addSettingTab(new BMOSettingTab(this.app, this));
	}

	handleFileSwitch() {
		checkActiveFile = this.app.workspace.getActiveFile();
	}

	async onunload() {
		this.app.workspace.getLeavesOfType(VIEW_TYPE_CHATBOT).forEach((leaf) => {
			const bmoView = leaf.view as BMOView;
	
			if (bmoView) {
				this.saveSettings();
				bmoView.cleanup();
			} 
		});
		
	}

	async activateView() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_CHATBOT);
	
		const rightLeaf = this.app.workspace.getRightLeaf(false);
		await rightLeaf.setViewState({
			type: VIEW_TYPE_CHATBOT,
			active: true,
		});

		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(VIEW_TYPE_CHATBOT)[0]
		);
	
		// Focus on the textarea
		const textarea = document.querySelector('.chatbox textarea') as HTMLTextAreaElement;
	
		if (textarea) {
			textarea.style.opacity = '0';
			textarea.style.transition = 'opacity 1s ease-in-out';
	
			setTimeout(() => {
				textarea.focus();
				textarea.style.opacity = '1';
			}, 50); 
		}
	
		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(VIEW_TYPE_CHATBOT)[0]
		);
	
		const messageContainer = document.querySelector("#messageContainer");
		if (messageContainer) {
			messageContainer.scroll({
				top: messageContainer.scrollHeight, 
				behavior: 'smooth' 
			});
		}
	}
	

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}