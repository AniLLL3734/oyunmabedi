export interface ChatRoomInfo {
    id: string;
    title: string;
    welcomeMessage: string;
    themeColor: string;
}

export const chatRoomDetails: { [key: string]: ChatRoomInfo } = {
    'server2': {
        id: 'server2',
        title: 'Sohbet Odası 2: Sunucu Beta',
        welcomeMessage: 'Kimlik doğrulamasız, kuralsız ve tamamen anonim. Burası Vahşi Batı!',
        themeColor: 'border-yellow-500',
    },
    'server3': {
        id: 'server3',
        title: 'Sohbet Odası 3: Sunucu Gama',
        welcomeMessage: 'Deneyimli gezginler için daha az kalabalık, moderasyonsuz bir sunucu.',
        themeColor: 'border-orange-500',
    },
    'server4': {
        id: 'server4',
        title: 'Sohbet Odası 4: Kaos Küresi',
        welcomeMessage: 'En kalabalık ve en kaotik sunucu. Her şeye hazırlıklı olun!',
        themeColor: 'border-red-500',
    },
    'main': {
        id: 'main',
        title: 'Ana Sohbet Odası',
        welcomeMessage: 'Güvenli, kurallı ve kimlik doğrulamalı ana sohbet odasına hoş geldiniz.',
        themeColor: 'border-green-500',
    },
};

export function getRoomInfo(serverId: string): ChatRoomInfo | undefined {
    return chatRoomDetails[serverId];
}