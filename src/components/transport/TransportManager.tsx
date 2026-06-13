import { Truck, Clock, MapPin, AlertTriangle, Moon, Shield, Coins, Sun } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { getNightEventPoolLabel } from '../../utils/nightRules';
import type { Trip } from '../../../shared/types';

const TransportManager = () => {
  const { trips, vehicles, routes, cities, commissions, goodsList, currentWeather, processTripEvents, currentTripId, showEvent, showSettlement } = useGameStore();
  
  const inProgressTrips = trips.filter(t => t.status === 'in_progress');
  const completedTrips = trips.filter(t => t.status === 'completed').slice(-5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress': return '运输中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
      default: return '待处理';
    }
  };

  const getNightChoiceLabel = (choice: string | null | undefined) => {
    switch (choice) {
      case 'night_pass': return { label: '夜行牌', icon: <Shield className="w-3 h-3" />, color: 'text-green-600' };
      case 'bribe': return { label: '贿赂通行', icon: <Coins className="w-3 h-3" />, color: 'text-amber-600' };
      case 'wait_dawn': return { label: '等待天亮', icon: <Sun className="w-3 h-3" />, color: 'text-slate-600' };
      default: return null;
    }
  };

  const getTripInfo = (trip: Trip) => {
    const vehicle = vehicles.find(v => v.id === trip.vehicleId);
    const route = routes.find(r => r.id === trip.routeId);
    const destCity = cities.find(c => 
      c.id === route?.toCityId || c.id === route?.fromCityId
    );
    const tripCommissions = commissions.filter(c => 
      trip.commissionIds.includes(c.id)
    );
    
    return { vehicle, destCity, tripCommissions };
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">运输管理</h2>
          <p className="text-slate-500">查看和管理正在进行的运输任务</p>
        </div>
        
        {currentWeather && (
          <div className="mb-6 p-4 bg-sky-50 border border-sky-200 rounded-xl flex items-center gap-3">
            <span className="text-3xl">{currentWeather.icon}</span>
            <div>
              <p className="font-medium text-sky-800">当前天气: {currentWeather.name}</p>
              <p className="text-sm text-sky-600">{currentWeather.description}</p>
            </div>
          </div>
        )}
        
        {inProgressTrips.length > 0 && (
          <div className={`mb-6 p-4 border rounded-xl ${
            useGameStore.getState().player.timeOfDay === 'night'
              ? 'bg-indigo-50 border-indigo-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {useGameStore.getState().player.timeOfDay === 'night' ? (
                  <Moon className="w-6 h-6 text-indigo-600" />
                ) : (
                  <Sun className="w-6 h-6 text-amber-600" />
                )}
                <div>
                  <p className={`font-medium ${
                    useGameStore.getState().player.timeOfDay === 'night'
                      ? 'text-indigo-800'
                      : 'text-amber-800'
                  }`}>
                    {useGameStore.getState().player.timeOfDay === 'night' ? '夜间运输' : '日间运输'}
                  </p>
                  <p className={`text-sm ${
                    useGameStore.getState().player.timeOfDay === 'night'
                      ? 'text-indigo-600'
                      : 'text-amber-600'
                  }`}>
                    {useGameStore.getState().player.timeOfDay === 'night'
                      ? '夜晚路途中可能遭遇特殊事件，点击下方按钮处理'
                      : '点击处理途中事件并完成运输结算'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  const isBusy = currentTripId || showEvent || showSettlement;
                  if (isBusy) return;
                  const trip = inProgressTrips[0];
                  processTripEvents(trip.id);
                }}
                disabled={!!currentTripId || showEvent || showSettlement}
                className={`px-5 py-2.5 text-white rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium ${
                  useGameStore.getState().player.timeOfDay === 'night'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400'
                }`}
              >
                {currentTripId ? '处理中...' : '处理途中事件'}
              </button>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-500" />
              进行中 ({inProgressTrips.length})
            </h3>
            
            {inProgressTrips.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-8 text-center">
                <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">暂无进行中的运输任务</p>
                <p className="text-sm text-slate-400 mt-1">请在路线规划中安排运输</p>
              </div>
            ) : (
              <div className="space-y-4">
                {inProgressTrips.map(trip => {
                  const { vehicle, destCity, tripCommissions } = getTripInfo(trip);
                  const totalWeight = tripCommissions.reduce((sum, c) => {
                    const goods = goodsList.find(g => g.id === c.goodsId);
                    return sum + (c.quantity * (goods?.weight || 1));
                  }, 0);
                  
                  const nightInfo = getNightChoiceLabel(trip.nightTravelChoice);
                  
                  return (
                    <div key={trip.id} className="bg-white rounded-xl shadow-md p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{vehicle?.icon || '🚚'}</span>
                          <div>
                            <div className="font-medium text-slate-800">
                              {vehicle?.name || '未知车辆'}
                            </div>
                            <div className="text-sm text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              前往 {destCity?.name || '未知目的地'}
                            </div>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
                          {getStatusLabel(trip.status)}
                        </span>
                      </div>
                      
                      {nightInfo && (
                        <div className="mb-3 flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 ${nightInfo.color}`}>
                            {nightInfo.icon}
                            {nightInfo.label}
                          </span>
                          <span className="text-xs text-slate-500">
                            {getNightEventPoolLabel(trip.nightEventPool || 'normal')}
                          </span>
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-600">运输进度</span>
                            <span className="font-medium text-slate-800">
                              {trip.progress}%
                            </span>
                          </div>
                          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                              style={{ width: `${trip.progress}%` }}
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="bg-slate-50 rounded-lg p-2 text-center">
                            <div className="text-slate-400 text-xs">货物</div>
                            <div className="font-medium text-slate-800">
                              {tripCommissions.length} 单
                            </div>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2 text-center">
                            <div className="text-slate-400 text-xs">载重</div>
                            <div className="font-medium text-slate-800">
                              {totalWeight}
                            </div>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2 text-center">
                            <div className="text-slate-400 text-xs">费用</div>
                            <div className="font-medium text-amber-600">
                              {trip.totalCost}
                            </div>
                          </div>
                        </div>
                        
                        {trip.events.length > 0 && (
                          <div className="pt-3 border-t border-slate-100">
                            <div className="text-xs text-slate-500 mb-2">途中事件</div>
                            <div className="space-y-1">
                              {trip.events.map((event, index) => (
                                <div key={index} className="text-xs text-slate-600 flex items-start gap-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5" />
                                  {event}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-500" />
              历史记录 ({completedTrips.length})
            </h3>
            
            {completedTrips.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-8 text-center">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">暂无历史记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedTrips.map(trip => {
                  const { vehicle, destCity, tripCommissions } = getTripInfo(trip);
                  const nightInfo = getNightChoiceLabel(trip.nightTravelChoice);
                  
                  return (
                    <div key={trip.id} className="bg-white rounded-xl shadow-md p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{vehicle?.icon || '🚚'}</span>
                          <span className="font-medium text-slate-800">
                            {vehicle?.name} → {destCity?.name}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(trip.status)}`}>
                          {getStatusLabel(trip.status)}
                        </span>
                      </div>
                      <div className="text-sm text-slate-500">
                        {tripCommissions.map(c => c.goodsName).join(', ')} x{tripCommissions.length}
                      </div>
                      {nightInfo && (
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Moon className="w-3 h-3" />
                          {nightInfo.label}
                        </div>
                      )}
                      {trip.actualArrivalTime && (
                        <div className="text-xs text-slate-400 mt-1">
                          完成时间: {new Date(trip.actualArrivalTime).toLocaleString()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransportManager;
