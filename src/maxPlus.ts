import * as vscode from 'vscode';
import * as path from 'path';
import * as http from 'http';

export class maxPlus implements vscode.TreeDataProvider<Dependency>{
	//默认事件
	private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined> = new vscode.EventEmitter<Dependency | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Dependency | undefined> = this._onDidChangeTreeData.event;
	//游戏类型
	private _gameType:string = vscode.workspace.getConfiguration("maxPlus").DefaultGame;
	//游戏图标
	private _iconName:string;
	//当前页数
	private _page:number = 0;
	//每页展示条数
	private _limit:number = 40;

	constructor() {

	}

	//更新列表数据
	refresh(gaemType?:string,pageType?:string): void {

		//改变页数
		pageType == "pre"  && this._page--;
		pageType == "next" && this._page++;
		//是否小于0
		if(this._page < 0){
			this._page = 0;
			vscode.window.showInformationMessage('不能再翻页了，已经到第一页了！(*^▽^*)');
			return;
		}
		//是否切换游戏
		if(gaemType && gaemType != this._gameType){
			this._gameType = gaemType;
			this._page = 0;//切换游戏后默认为第一页数据
		}
		//更新列表
		this._onDidChangeTreeData.fire();
	}
	//获取列表数据展示
	getTreeItem(element: Dependency): vscode.TreeItem {
		return element;
	}

	//获取数据
	getChildren(element?: Dependency) {
		return this.getMaxJson();
	}

	//异步请求
	async  getMaxJson() {
		let re = await this.requestOrderAPI();
		return Promise.resolve(this.getMaxPlusData(re));
	}

	//请求url json数据
	private requestOrderAPI() {
		let url: string = "http://news.maxjia.com/maxnews/app/list?game_type="+this._gameType+"&imei=354702090309389&os_type=Android&os_version=9&version=4.3.2&lang=zh-cn&offset=" +(this._page * this._limit)+"&limit="+this._limit;
		return new Promise(function (resolve, reject) {
			http.get(url, (res) => {
				res.setEncoding('utf8');
				let rawData = '';
				res.on('data', function (chunk) {
					rawData += chunk;
				});
				res.on('end', () => {
					resolve(rawData);
				});
			});
		});
	}


	//处理数据添加到集合内
	private getMaxPlusData(data: any): Dependency[] {
		if (data == "") return [];
		const maxJson = JSON.parse(data);
		//检测数据
		if ((typeof maxJson != 'object' && !maxJson) || (maxJson.result.length <= 0)) {
			vscode.window.showInformationMessage('好像没有数据了！(*^▽^*)');
			return [];
		}
		//根据游戏类型分配图标
		switch(this._gameType){
			case "ow":
			this._iconName = "Overwatch";
			break;
			case "dota2":
			this._iconName = "dota";
			break;
			case "csgo":
			this._iconName="csgo";
			break;
			case "hs":
			this._iconName="Hearthstone";
			break;
		}
		//处理数据
		const toDep = (title: string, url: string, linkId: number): Dependency => {
			url = linkId <= 0 ? url+'?' : 'https://news.maxjia.com/bbs/app/api/web/share?link_id=' + linkId;
			return new Dependency(title, vscode.TreeItemCollapsibleState.None,this._iconName, {
				command: "maxPlus.detail",
				title: '',
				arguments: [url,this._iconName]
			});
		}
		//循环添加数据
		let list = Object.keys(maxJson.result).map(dep => toDep(
			maxJson.result[dep]['title'], 
			maxJson.result[dep]['newUrl'],
			maxJson.result[dep]['linkid']
		));
		return list;
	}

}

//列表类
class Dependency extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public iconName:string,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);
	}

	get tooltip(): string {
		return this.label;
	}

	iconPath = {
		light: path.join(__filename,  '..', '..', 'resources', 'light', this.iconName + '.svg'),
		dark: path.join(__filename,  '..', '..', 'resources', 'dark', this.iconName + '.svg')
	};

	contextValue = 'dependency';
}
