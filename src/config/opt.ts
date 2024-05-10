export enum MessageType {
    DIRECT = "DIRECT",
    GUILD = "GUILD",
    GROUP = "GROUP",
    FRIEND = "FRIEND",
}

const opt = {
    desc: "命令总览json,按照顺序进行匹配",
    command: {
        bind: {
            bind: {
                reg: "^/?(bind|绑定)",
                fnc: "bind",
                type: [MessageType.DIRECT, MessageType.GUILD],
                channelAllows: ["all"],
                describe: "绑定QQ token",
                export: '/绑定'
            }
        },
        help: {
            help: {
                reg: "^/?(help|menu|帮助|菜单)$",
                fnc: "help",
                type: [MessageType.GUILD, MessageType.GROUP, MessageType.DIRECT],
                channelAllows: ["all"],
                describe: "获取全局帮助"
            }
        },
        plan: {
            planUpdate: {
                reg: "^/?(planUpdate|时间表设置)",
                fnc: "planUpdate",
                type: [MessageType.DIRECT, MessageType.GUILD],
                channelAllows: ["all"],
                describe: "时间表设置",
                export: "/时间表设置 <名称 时间> [... <名称 时间>]",
            },
            planInfo: {
                reg: "^/?(info|时间表)",
                fnc: "planInfo",
                type: [MessageType.DIRECT, MessageType.GUILD],
                channelAllows: ["all"],
                describe: "时间表",
                export: "/时间表"
            },
            plan: {
                reg: "^/?(plan|排班)",
                fnc: "plan",
                type: [MessageType.DIRECT, MessageType.GUILD],
                channelAllows: ["all"],
                describe: "排班",
                export: "/排班 <IMAGE>"
            },
        },
        test: {
            test: {
                reg: "test",
                fnc: "test",
                type: [MessageType.GUILD, MessageType.DIRECT, MessageType.GROUP],
                channelAllows: ["all"],
                describe: "测试测试测试测试（确信）"
            }
        },
        admin: {
            dmsMe: {
                reg: "^/?dmsme",
                fnc: "dmsMe",
                type: [MessageType.GUILD],
                channelAllows: ["all"],
                describe: "创建一个私信会话并pong"
            },
            ping: {
                reg: "^/?ping",
                fnc: "ping",
                type: [MessageType.GUILD, MessageType.DIRECT, MessageType.GROUP],
                channelAllows: ["all"],
                describe: "检测redis数据库是否正常"
            },
            status: {
                reg: "^/?(状态|status)$",
                fnc: "status",
                type: [MessageType.GUILD, MessageType.DIRECT, MessageType.GROUP],
                channelAllows: ["all"],
                describe: "查询bot与服务器状态",
                export: "/状态"
            },
        },
    },
} as ConfigOpts;

export default opt;

interface ConfigOpts {
    desc: string;
    command: Commands;
}

type Commands = Record<string, CommandFather>;
type CommandFather = Record<string, CommandPart>;
interface CommandPart {
    reg: string;
    fnc: string;
    channelAllows?: string[];
    data?: string;
    type: MessageType[],
    describe: string;
    export?: string;
};