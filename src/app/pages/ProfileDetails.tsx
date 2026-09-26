import { Save } from 'lucide-react';
import image_b04caf5f9d421e0eeb12a0dc69d03e6e92f07bad from 'figma:asset/b04caf5f9d421e0eeb12a0dc69d03e6e92f07bad.png';

export function ProfileDetails() {
  return (
    <div className="p-6 max-w-4xl">
      <div className="bg-card rounded-xl border border-border p-6">
        <h1 className="text-2xl font-semibold text-foreground mb-6">Thông tin cá nhân</h1>
        
        {/* Profile Picture */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground/80 mb-2">Ảnh đại diện</label>
          <div className="flex items-center gap-4">
            <img
              src={image_b04caf5f9d421e0eeb12a0dc69d03e6e92f07bad}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover"
            />
            <button className="px-4 py-2 bg-muted text-foreground/80 rounded-full hover:bg-muted transition-all text-sm font-medium">
              Thay đổi ảnh
            </button>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Họ</label>
              <input
                type="text"
                placeholder="Nguyễn"
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Tên</label>
              <input
                type="text"
                placeholder="Văn A"
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">Email</label>
            <input
              type="email"
              placeholder="example@email.com"
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">Số điện thoại</label>
            <input
              type="tel"
              placeholder="+84 xxx xxx xxx"
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">Công ty</label>
            <input
              type="text"
              placeholder="Tên công ty"
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">Chức vụ</label>
            <input
              type="text"
              placeholder="Marketing Manager"
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-all font-medium">
            <Save className="w-4 h-4" />
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
