var PuzzleTile = new Phaser.Class({

    Extends: Phaser.Tilemaps.Tile,

    initialize: function (index, x, y, data, layer) 
    {
        layer = (layer !== undefined) ? layer : 'room';
        if ( !( layer instanceof Phaser.Tilemaps.LayerData ) )
            layer = gameScene.level.map.getLayer( layer );
        Phaser.Tilemaps.Tile.call( this, layer, index, x, y, gameScene.tileSize, gameScene.tileSize );


        this.defaultData = {
            isSolid: true,
            isActive: false,
            flags: []
        };

        this.setData(data);
    },

    getData: function ()
    {
        var tileName = "unknown";
        for(var name in TILES) {
            if (TILES[name] === this.index) 
            {
                tileName = name;
                break;
            }
        }
        // return {
        //     index: this.index,
        //     type: tileName
        // }
        return this.index
    },

    setData: function (data)
    {
        data = (data === undefined || data === null) ? {} : data;
        for (var attr in this.defaultData)
        {
            this[attr] = (data[attr] === undefined || data[attr] === null) ? this.defaultData[attr] : data[attr];
        }
    }
});

var TILES = 
{
    floor: 0,
    wall: 1,
    charger: 2,
    activator: 3,
    hardTWall: 4, //toggleable wall
    softTWall: 5
}

PuzzleTile.makeFromIndex = function (index, x, y, data, layer) 
{
    switch (index) {
        default:
            return new PuzzleTile(index, x, y, data, layer);
            break;

        case TILES.floor:
            return new Floor(x, y, data, layer);
            break;

        case TILES.wall:
            return new Wall(x, y, data, layer);
            break;

        case TILES.charger:
            return new Charger(x, y, data, layer);
            break;

        case TILES.activator:
            return new Activator(x, y, data, layer);
            break;
    }
}

var Floor = new Phaser.Class({

    Extends: PuzzleTile,

    initialize: function (x, y, data, layer)
    {
        PuzzleTile.call(this, TILES.floor, x, y, data, layer);

        this.defaultData.isSolid = false;
        this.setData(data);
    }
});

var Wall = new Phaser.Class({

    Extends: PuzzleTile,

    initialize: function (x, y, data, layer)
    {
        PuzzleTile.call(this, TILES.wall, x, y, data, layer);
    }
});

var Charger = new Phaser.Class({

    Extends: PuzzleTile,

    initialize: function (x, y, data, layer)
    {
        PuzzleTile.call(this, TILES.charger, x, y, data, layer);

        this.defaultData.isSolid = false;
        this.setData(data);
    }
});

var Activator = new Phaser.Class({

    Extends: PuzzleTile,

    initialize: function (x, y, data, layer)
    {
        PuzzleTile.call(this, TILES.activator, x, y, data, layer);

        this.defaultData.flags = ['0'];
        this.setData(data);
    },

    update: function ()
    {
        var n = gameScene.map.getTileAt(this.x, this.y-1, null, 'wires');
        var s = gameScene.map.getTileAt(this.x, this.y+1, null, 'wires');
        var e = gameScene.map.getTileAt(this.x+1, this.y, null, 'wires');
        var w = gameScene.map.getTileAt(this.x-1, this.y, null, 'wires');

        if (
            (n.isConnectableWith(this.x, this.y) && n.powered) ||
            (s.isConnectableWith(this.x, this.y) && s.powered) ||
            (e.isConnectableWith(this.x, this.y) && e.powered) ||
            (w.isConnectableWith(this.x, this.y) && w.powered)
        ) {
            this.isActive = true;
        }
        else {
            this.isActive = false;
        }

        var tiles = gameScene.map.getTilesWithin(0, 0, undefined, undefined, {isNotEmpty: true}, 'room');

        for (var i = 0; i < tiles.length; i ++) {
            if (tiles[i].flags.indexOf(this.flags[0]) !== -1) tiles[i].isActive = this.isActive;
        }

    }
});

var Wire = new Phaser.Class({

    Extends: PuzzleTile,

    initialize: function (x, y, data, layer) 
    {
        layer = (layer !== undefined) ? layer : 'wires';        
        PuzzleTile.call(this, 0, x, y, data, layer);

        this.powered = false;
        this.north = false;
        this.south = false;
        this.east = false;
        this.west = false;

        this.connectableTiles = [TILES.input, TILES.output];
        this.tileDirectionIndicies = {
            '': 0,
            'N': 1,   'S': 1,    'NS': 1,
            'E': 2,   'W': 2,    'EW': 2,
            'SE': 3,  'SEW': 4,  'SW': 5,
            'NSE': 6, 'NSEW': 7, 'NSW': 8,
            'NE': 9,  'NEW': 10, 'NW': 11
        }
    },

    findPathToPowerSource:  function (checkedTiles) 
    {
        if(checkedTiles.indexOf(this) !== -1) return false;
        if (this.hasNeighboringPowerSource()) return true;
        else {
            checkedTiles.push(this);
            var neighbors = this.getWireNeighbors();
            for (var i=0; i<neighbors.length; i++) 
            {
                if (neighbors[i].findPathToPowerSource(checkedTiles)) return true;
            }
        }
        return false;
    },

    isConnectableWith: function (x, y) 
    {
        let tile = this.tilemap.getTileAt(x, y, true, 'wires');
        if (tile.index !== -1) return true;

        tile = this.tilemap.getTileAt(x, y, true, 'room');
        if (this.connectableTiles.indexOf(tile.index) != -1) return true;
        return false;
    },

    getDirectionIndex: function () 
    {
        let dir = '';
        if (this.north) dir += 'N';
        if (this.south) dir += 'S';
        if (this.east) dir += 'E';
        if (this.west) dir += 'W';
        return this.tileDirectionIndicies[dir];
    },

    getWireNeighbors: function () 
    {
        var neighbors = [];

        var tile = this.tilemap.getTileAt(this.x, this.y-1, null, 'wires');
        if (this.north && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x, this.y+1, null, 'wires');
        if (this.south && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x+1, this.y, null, 'wires');
        if (this.east && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x-1, this.y, null, 'wires');
        if (this.west && tile !== null) neighbors.push(tile);

        return neighbors;
    },

    getRoomNeighbors: function () 
    {
        var neighbors = [];

        var tile = this.tilemap.getTileAt(this.x, this.y-1, null, 'room');
        if (this.north && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x, this.y+1, null, 'room');
        if (this.south && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x+1, this.y, null, 'room');
        if (this.east && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x-1, this.y, null, 'room');
        if (this.west && tile !== null) neighbors.push(tile);

        return neighbors;
    },

    hasNeighboringPowerSource: function () 
    {
        var neighbors = this.getRoomNeighbors();
        for(var i=0; i<neighbors.length; i++) 
        {
            if (neighbors[i].index === TILES.output) return true;
        }
        return false;
    },

    hasNeighboringPowerInput: function () 
    {
        var neighbors = this.getRoomNeighbors();
        for(var i=0; i<neighbors.length; i++) 
        {
            if (neighbors[i].index === TILES.input) return true;
        }
        return false;
    },

    break: function () 
    {
        this.tilemap.putTileAt(-1, this.x, this.y, null, 'wires');
        gameScene.level.updateWires();
    },

    updateColor: function () 
    {
        //set color
        if (this.powered === true)
            this.tint = gameScene.colors.powered_blue;
        else
            this.tint = gameScene.colors.unpowered_blue;
    },

    updateConnections: function () 
    {
        this.north = this.isConnectableWith(this.x, this.y - 1);
        this.south = this.isConnectableWith(this.x, this.y + 1);
        this.east = this.isConnectableWith(this.x + 1, this.y);
        this.west = this.isConnectableWith(this.x - 1, this.y);
        this.index = this.getDirectionIndex();
    }
});